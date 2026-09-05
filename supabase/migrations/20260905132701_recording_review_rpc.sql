create or replace function public.register_recording(
  p_round_id uuid,
  p_player_id uuid,
  p_attempt smallint,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_duration_ms integer,
  p_start_offset_ms integer,
  p_end_offset_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_player public.players;
  target_round public.rounds;
  target_lobby public.lobbies;
  recording_id uuid;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'SESSION_EXPIRED';
  end if;

  if p_attempt not between 1 and 2 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_RECORDING_ATTEMPT';
  end if;

  if p_size_bytes <= 0
     or p_size_bytes > 10485760 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_RECORDING';
  end if;

  if p_duration_ms <= 0
     or p_duration_ms > 1800000 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_RECORDING';
  end if;

  select *
  into target_player
  from public.players
  where id = p_player_id
    and user_id = auth.uid()
    and left_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'NOT_LOBBY_MEMBER';
  end if;

  select *
  into target_round
  from public.rounds
  where id = p_round_id
    and lobby_id = target_player.lobby_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ROUND_NOT_FOUND';
  end if;

  select *
  into target_lobby
  from public.lobbies
  where id = target_player.lobby_id
  for update;

  if target_lobby.current_round_id <> target_round.id
     or target_lobby.state not in (
       'RECORDING',
       'REVIEW'
     ) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  if p_storage_path <>
    concat(
      target_player.lobby_id::text,
      '/',
      target_round.id::text,
      '/',
      target_player.id::text,
      '/attempt-',
      p_attempt::text,
      case
        when p_mime_type like '%ogg%' then '.ogg'
        when p_mime_type like '%mp4%' then '.m4a'
        else '.webm'
      end
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_RECORDING_PATH';
  end if;

  if p_attempt = 2 and not exists (
    select 1
    from public.recordings existing
    where existing.round_id = target_round.id
      and existing.player_id = target_player.id
      and existing.attempt = 1
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_RECORDING_ATTEMPT';
  end if;

  insert into public.recordings (
    round_id,
    player_id,
    attempt,
    status,
    storage_path,
    mime_type,
    size_bytes,
    duration_ms,
    start_offset_ms,
    end_offset_ms
  )
  values (
    target_round.id,
    target_player.id,
    p_attempt,
    'READY',
    p_storage_path,
    p_mime_type,
    p_size_bytes,
    p_duration_ms,
    p_start_offset_ms,
    p_end_offset_ms
  )
  on conflict (round_id, player_id, attempt)
  do update set
    status = 'READY',
    storage_path = excluded.storage_path,
    mime_type = excluded.mime_type,
    size_bytes = excluded.size_bytes,
    duration_ms = excluded.duration_ms,
    start_offset_ms = excluded.start_offset_ms,
    end_offset_ms = excluded.end_offset_ms,
    created_at = now(),
    validated_at = null
  returning id into recording_id;

  update public.players
  set round_status = 'REVIEWING'
  where id = target_player.id;

  perform public.advance_round_to_review_if_ready(
    target_round.id
  );

  return jsonb_build_object(
    'recordingId', recording_id,
    'snapshot', public.build_lobby_snapshot(
      target_lobby.id,
      auth.uid()
    )
  );
end;
$$;

revoke all on function public.register_recording(
  uuid,
  uuid,
  smallint,
  text,
  text,
  bigint,
  integer,
  integer,
  integer
) from public;

grant execute on function public.register_recording(
  uuid,
  uuid,
  smallint,
  text,
  text,
  bigint,
  integer,
  integer,
  integer
) to authenticated;


create or replace function public.validate_recording(
  p_recording_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_recording public.recordings;
  target_player public.players;
  target_round public.rounds;
  unresolved_players integer;
begin
  select r.*
  into target_recording
  from public.recordings r
  join public.players p
    on p.id = r.player_id
  where r.id = p_recording_id
    and p.user_id = auth.uid()
    and p.left_at is null
  for update of r;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RECORDING_NOT_FOUND';
  end if;

  select *
  into target_player
  from public.players
  where id = target_recording.player_id
  for update;

  select *
  into target_round
  from public.rounds
  where id = target_recording.round_id
  for update;

  update public.recordings
  set
    status = case
      when id = target_recording.id
        then 'VALIDATED'::public.recording_status
      else 'REPLACED'::public.recording_status
    end,
    validated_at = case
      when id = target_recording.id
        then now()
      else validated_at
    end
  where round_id = target_recording.round_id
    and player_id = target_recording.player_id;

  update public.players
  set round_status = 'VALIDATED'
  where id = target_player.id;

  select count(*)
  into unresolved_players
  from public.players p
  where p.lobby_id = target_round.lobby_id
    and p.left_at is null
    and p.connected = true
    and p.last_seen_at >
      now() - interval '30 seconds'
    and p.round_status not in (
      'VALIDATED',
      'NO_MIC',
      'ABANDONED',
      'DISCONNECTED',
      'FAILED'
    );

  if unresolved_players = 0 then
    update public.rounds
    set state = 'FINAL_READY'
    where id = target_round.id;

    update public.lobbies
    set state = 'FINAL_READY'
    where id = target_round.lobby_id;
  end if;

  return public.build_lobby_snapshot(
    target_round.lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function
  public.validate_recording(uuid)
from public;

grant execute on function
  public.validate_recording(uuid)
to authenticated;


create or replace function public.skip_player_recording(
  p_player_id uuid,
  p_round_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_player public.players;
  target_round public.rounds;
  unresolved_players integer;
begin
  select *
  into target_player
  from public.players
  where id = p_player_id
    and user_id = auth.uid()
    and left_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'NOT_LOBBY_MEMBER';
  end if;

  select *
  into target_round
  from public.rounds
  where id = p_round_id
    and lobby_id = target_player.lobby_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ROUND_NOT_FOUND';
  end if;

  update public.players
  set round_status = case
    when microphone_state in (
      'DENIED',
      'UNAVAILABLE'
    )
      then 'NO_MIC'::public.player_round_status
    else 'ABANDONED'::public.player_round_status
  end
  where id = target_player.id;

  select count(*)
  into unresolved_players
  from public.players p
  where p.lobby_id = target_round.lobby_id
    and p.left_at is null
    and p.connected = true
    and p.last_seen_at >
      now() - interval '30 seconds'
    and p.round_status not in (
      'VALIDATED',
      'NO_MIC',
      'ABANDONED',
      'DISCONNECTED',
      'FAILED'
    );

  if unresolved_players = 0 then
    update public.rounds
    set state = 'FINAL_READY'
    where id = target_round.id;

    update public.lobbies
    set state = 'FINAL_READY'
    where id = target_round.lobby_id;
  end if;

  return public.build_lobby_snapshot(
    target_round.lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function
  public.skip_player_recording(uuid, uuid)
from public;

grant execute on function
  public.skip_player_recording(uuid, uuid)
to authenticated;
