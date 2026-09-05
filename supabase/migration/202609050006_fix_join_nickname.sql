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

  if existing_player.id is not null then
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

  select available_slot::smallint
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
