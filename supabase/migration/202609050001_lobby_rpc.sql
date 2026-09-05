create or replace function public.normalize_nickname(
  raw_nickname text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    btrim(coalesce(raw_nickname, '')),
    '\s+',
    ' ',
    'g'
  );
$$;

create or replace function public.normalize_lobby_code(
  raw_code text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(
    regexp_replace(
      coalesce(raw_code, ''),
      '[^A-Za-z0-9]',
      '',
      'g'
    )
  );
$$;

create or replace function public.generate_lobby_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text := '';
  index_number integer;
begin
  for index_number in 1..4 loop
    generated_code := generated_code || substr(
      alphabet,
      1 + floor(random() * length(alphabet))::integer,
      1
    );
  end loop;

  return generated_code;
end;
$$;

create or replace function public.build_lobby_snapshot(
  target_lobby_id uuid,
  target_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'lobby',
    jsonb_build_object(
      'id', l.id,
      'code', l.code,
      'hostPlayerId', l.host_player_id,
      'state', l.state,
      'currentRoundId', l.current_round_id,
      'selectedVideo', l.selected_video,
      'version', l.version,
      'createdAt', l.created_at,
      'updatedAt', l.updated_at,
      'expiresAt', l.expires_at
    ),
    'players',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'lobbyId', p.lobby_id,
            'userId', p.user_id,
            'nickname', p.nickname,
            'slot', p.slot,
            'connected', p.connected,
            'microphoneState', p.microphone_state,
            'roundStatus', p.round_status,
            'lastSeenAt', p.last_seen_at,
            'joinedAt', p.joined_at,
            'leftAt', p.left_at,
            'isHost', p.id = l.host_player_id
          )
          order by p.slot
        )
        from public.players p
        where p.lobby_id = l.id
          and p.left_at is null
      ),
      '[]'::jsonb
    ),
    'currentPlayerId',
    (
      select current_player.id
      from public.players current_player
      where current_player.lobby_id = l.id
        and current_player.user_id = target_user_id
        and current_player.left_at is null
      limit 1
    ),
    'serverTime',
    clock_timestamp()
  )
  from public.lobbies l
  where l.id = target_lobby_id;
$$;

revoke all on function public.build_lobby_snapshot(uuid, uuid)
from public;

create or replace function public.create_lobby(
  p_nickname text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_nickname text;
  generated_code text;
  created_lobby public.lobbies;
  created_player public.players;
  creation_attempt integer;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'SESSION_EXPIRED';
  end if;

  normalized_nickname :=
    public.normalize_nickname(p_nickname);

  if char_length(normalized_nickname) < 1
     or char_length(normalized_nickname) > 24 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_NICKNAME';
  end if;

  for creation_attempt in 1..20 loop
    generated_code := public.generate_lobby_code();

    begin
      insert into public.lobbies (
        code,
        state,
        expires_at
      )
      values (
        generated_code,
        'VIDEO_SELECTION',
        now() + interval '8 hours'
      )
      returning * into created_lobby;

      exit;
    exception
      when unique_violation then
        if creation_attempt = 20 then
          raise;
        end if;
    end;
  end loop;

  insert into public.players (
    lobby_id,
    user_id,
    nickname,
    slot,
    connected,
    last_seen_at
  )
  values (
    created_lobby.id,
    auth.uid(),
    normalized_nickname,
    1,
    true,
    now()
  )
  returning * into created_player;

  update public.lobbies
  set host_player_id = created_player.id
  where id = created_lobby.id
  returning * into created_lobby;

  return public.build_lobby_snapshot(
    created_lobby.id,
    auth.uid()
  );
end;
$$;

revoke all on function public.create_lobby(text)
from public;

grant execute on function public.create_lobby(text)
to authenticated;

create or replace function public.join_lobby(
  p_code text,
  p_nickname text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_code text;
  normalized_nickname text;
  target_lobby public.lobbies;
  existing_player public.players;
  selected_slot smallint;
  active_count integer;
  nickname_already_used boolean;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'SESSION_EXPIRED';
  end if;

  normalized_code :=
    public.normalize_lobby_code(p_code);

  normalized_nickname :=
    public.normalize_nickname(p_nickname);

  if char_length(normalized_code) <> 4 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_CODE';
  end if;

  if char_length(normalized_nickname) < 1
     or char_length(normalized_nickname) > 24 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_NICKNAME';
  end if;

  select *
  into target_lobby
  from public.lobbies
  where code = normalized_code
    and expires_at > now()
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'LOBBY_NOT_FOUND';
  end if;

  select *
  into existing_player
  from public.players
  where lobby_id = target_lobby.id
    and user_id = auth.uid()
  limit 1;

  select exists (
  select 1
  from public.players p
  where p.lobby_id = target_lobby.id
    and p.left_at is null
    and lower(btrim(p.nickname)) =
      lower(btrim(normalized_nickname))
    and (
      existing_player.id is null
      or p.id <> existing_player.id
    )
    )
    into nickname_already_used;

    if nickname_already_used then
    raise exception using
        errcode = 'P0001',
        message = 'NICKNAME_TAKEN';
    end if;

  if found then
    update public.players
    set
      nickname = normalized_nickname,
      connected = true,
      last_seen_at = now(),
      left_at = null
    where id = existing_player.id;

    if target_lobby.host_player_id is null then
      update public.lobbies
      set host_player_id = existing_player.id
      where id = target_lobby.id;
    end if;

    return public.build_lobby_snapshot(
      target_lobby.id,
      auth.uid()
    );
  end if;

  select count(*)
  into active_count
  from public.players
  where lobby_id = target_lobby.id
    and left_at is null;

  if active_count >= 4 then
    raise exception using
      errcode = 'P0001',
      message = 'LOBBY_FULL';
  end if;

  select available_slot
  into selected_slot
  from generate_series(1, 4) as available_slot
  where not exists (
    select 1
    from public.players p
    where p.lobby_id = target_lobby.id
      and p.slot = available_slot
      and p.left_at is null
  )
  order by available_slot
  limit 1;

  if selected_slot is null then
    raise exception using
      errcode = 'P0001',
      message = 'LOBBY_FULL';
  end if;

  insert into public.players (
    lobby_id,
    user_id,
    nickname,
    slot,
    connected,
    last_seen_at
  )
  values (
    target_lobby.id,
    auth.uid(),
    normalized_nickname,
    selected_slot,
    true,
    now()
  );

  return public.build_lobby_snapshot(
    target_lobby.id,
    auth.uid()
  );
end;
$$;

revoke all on function public.join_lobby(text, text)
from public;

grant execute on function public.join_lobby(text, text)
to authenticated;

create or replace function public.get_lobby_snapshot(
  p_code text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_code text;
  target_lobby_id uuid;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'SESSION_EXPIRED';
  end if;

  normalized_code :=
    public.normalize_lobby_code(p_code);

  select l.id
  into target_lobby_id
  from public.lobbies l
  join public.players p
    on p.lobby_id = l.id
  where l.code = normalized_code
    and l.expires_at > now()
    and p.user_id = auth.uid()
    and p.left_at is null
  limit 1;

  if target_lobby_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'NOT_LOBBY_MEMBER';
  end if;

  return public.build_lobby_snapshot(
    target_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.get_lobby_snapshot(text)
from public;

grant execute on function public.get_lobby_snapshot(text)
to authenticated;
