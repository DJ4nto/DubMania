create or replace function public.prepare_round(
  p_lobby_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lobby public.lobbies;
  created_round public.rounds;
  next_sequence integer;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'SESSION_EXPIRED';
  end if;

  if not public.is_lobby_host(p_lobby_id) then
    raise exception using
      errcode = 'P0001',
      message = 'HOST_ONLY';
  end if;

  select *
  into target_lobby
  from public.lobbies
  where id = p_lobby_id
    and expires_at > now()
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'LOBBY_NOT_FOUND';
  end if;

  if target_lobby.state <> 'VIDEO_SELECTION' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  if target_lobby.selected_video is null then
    raise exception using
      errcode = 'P0001',
      message = 'VIDEO_REQUIRED';
  end if;

  select coalesce(max(sequence_number), 0) + 1
  into next_sequence
  from public.rounds
  where lobby_id = p_lobby_id;

  insert into public.rounds (
    lobby_id,
    sequence_number,
    video,
    state,
    created_at
  )
  values (
    p_lobby_id,
    next_sequence,
    target_lobby.selected_video,
    'PREPARING',
    now()
  )
  returning * into created_round;

  update public.players
  set round_status = case
    when microphone_state in ('DENIED', 'UNAVAILABLE')
      then 'NO_MIC'::public.player_round_status
    when connected = false
      then 'DISCONNECTED'::public.player_round_status
    else 'PREPARING'::public.player_round_status
  end
  where lobby_id = p_lobby_id
    and left_at is null;

  update public.lobbies
  set
    state = 'PREPARING',
    current_round_id = created_round.id
  where id = p_lobby_id;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.prepare_round(uuid)
from public;

grant execute on function public.prepare_round(uuid)
to authenticated;


create or replace function public.set_player_round_ready(
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
  target_lobby public.lobbies;
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

  select *
  into target_lobby
  from public.lobbies
  where id = target_player.lobby_id
  for update;

  if target_lobby.current_round_id <> p_round_id
     or target_lobby.state <> 'PREPARING'
     or target_round.state <> 'PREPARING' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  update public.players
  set
    round_status = 'READY',
    connected = true,
    last_seen_at = now()
  where id = target_player.id;

  return public.build_lobby_snapshot(
    target_lobby.id,
    auth.uid()
  );
end;
$$;

revoke all on function public.set_player_round_ready(uuid, uuid)
from public;

grant execute on function public.set_player_round_ready(uuid, uuid)
to authenticated;


create or replace function public.schedule_round_start(
  p_lobby_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lobby public.lobbies;
  target_round public.rounds;
  unresolved_players integer;
  scheduled_time timestamptz;
  video_duration_seconds integer;
begin
  if not public.is_lobby_host(p_lobby_id) then
    raise exception using
      errcode = 'P0001',
      message = 'HOST_ONLY';
  end if;

  select *
  into target_lobby
  from public.lobbies
  where id = p_lobby_id
  for update;

  if not found or target_lobby.current_round_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'ROUND_NOT_FOUND';
  end if;

  select *
  into target_round
  from public.rounds
  where id = target_lobby.current_round_id
  for update;

  if target_lobby.state <> 'PREPARING'
     or target_round.state <> 'PREPARING' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  select count(*)
  into unresolved_players
  from public.players
  where lobby_id = p_lobby_id
    and left_at is null
    and connected = true
    and last_seen_at > now() - interval '30 seconds'
    and microphone_state not in ('DENIED', 'UNAVAILABLE')
    and round_status <> 'READY';

  if unresolved_players > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'PLAYERS_NOT_READY';
  end if;

  scheduled_time := clock_timestamp() + interval '5 seconds';

  video_duration_seconds :=
    case
      when jsonb_typeof(target_round.video -> 'duration')
        = 'number'
      then greatest(
        1,
        (target_round.video ->> 'duration')::integer
      )
      else 300
    end;

  update public.rounds
  set
    state = 'COUNTDOWN',
    scheduled_start_at = scheduled_time,
    recording_deadline_at =
      scheduled_time
      + make_interval(secs => video_duration_seconds + 20)
  where id = target_round.id;

  update public.lobbies
  set state = 'COUNTDOWN'
  where id = p_lobby_id;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.schedule_round_start(uuid)
from public;

grant execute on function public.schedule_round_start(uuid)
to authenticated;


create or replace function public.confirm_round_started(
  p_lobby_id uuid,
  p_round_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lobby public.lobbies;
  target_round public.rounds;
begin
  select *
  into target_lobby
  from public.lobbies
  where id = p_lobby_id
  for update;

  if not found
     or target_lobby.current_round_id <> p_round_id then
    raise exception using
      errcode = 'P0001',
      message = 'ROUND_NOT_FOUND';
  end if;

  select *
  into target_round
  from public.rounds
  where id = p_round_id
  for update;

  if target_lobby.state = 'RECORDING'
     and target_round.state = 'RECORDING' then
    return public.build_lobby_snapshot(
      p_lobby_id,
      auth.uid()
    );
  end if;

  if target_lobby.state <> 'COUNTDOWN'
     or target_round.state <> 'COUNTDOWN' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  if target_round.scheduled_start_at is null
     or clock_timestamp()
       < target_round.scheduled_start_at
         - interval '500 milliseconds' then
    raise exception using
      errcode = 'P0001',
      message = 'ROUND_NOT_STARTED_YET';
  end if;

  update public.rounds
  set state = 'RECORDING'
  where id = p_round_id;

  update public.lobbies
  set state = 'RECORDING'
  where id = p_lobby_id;

  update public.players
  set round_status = case
    when round_status = 'READY'
      then 'RECORDING'::public.player_round_status
    else round_status
  end
  where lobby_id = p_lobby_id
    and left_at is null;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.confirm_round_started(uuid, uuid)
from public;

grant execute on function public.confirm_round_started(uuid, uuid)
to authenticated;


create or replace function public.cancel_round_preparation(
  p_lobby_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lobby public.lobbies;
  cancelled_round_id uuid;
begin
  if not public.is_lobby_host(p_lobby_id) then
    raise exception using
      errcode = 'P0001',
      message = 'HOST_ONLY';
  end if;

  select *
  into target_lobby
  from public.lobbies
  where id = p_lobby_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'LOBBY_NOT_FOUND';
  end if;

  if target_lobby.state not in (
    'PREPARING',
    'COUNTDOWN'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  cancelled_round_id := target_lobby.current_round_id;

  update public.lobbies
  set
    state = 'VIDEO_SELECTION',
    current_round_id = null
  where id = p_lobby_id;

  update public.players
  set round_status = case
    when microphone_state in ('DENIED', 'UNAVAILABLE')
      then 'NO_MIC'::public.player_round_status
    else 'IDLE'::public.player_round_status
  end
  where lobby_id = p_lobby_id
    and left_at is null;

  if cancelled_round_id is not null then
    delete from public.rounds
    where id = cancelled_round_id;
  end if;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.cancel_round_preparation(uuid)
from public;

grant execute on function public.cancel_round_preparation(uuid)
to authenticated;
