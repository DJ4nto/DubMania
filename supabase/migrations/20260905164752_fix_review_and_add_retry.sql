create or replace function public.advance_round_to_review_if_ready(
  p_round_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_round public.rounds;
  unresolved_recorders integer;
begin
  select *
  into target_round
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    return;
  end if;

  select count(*)
  into unresolved_recorders
  from public.players p
  where p.lobby_id = target_round.lobby_id
    and p.left_at is null
    and p.connected = true
    and p.last_seen_at >
      now() - interval '30 seconds'
    and p.round_status in (
      'PREPARING',
      'READY',
      'RECORDING',
      'UPLOADING'
    );

  if unresolved_recorders = 0 then
    update public.rounds
    set
      state = 'REVIEW',
      review_deadline_at = coalesce(
        review_deadline_at,
        clock_timestamp() + interval '2 minutes'
      )
    where id = target_round.id
      and state in ('RECORDING', 'REVIEW');

    update public.lobbies
    set state = 'REVIEW'
    where id = target_round.lobby_id
      and state in ('RECORDING', 'REVIEW');
  end if;
end;
$$;

revoke all on function
  public.advance_round_to_review_if_ready(uuid)
from public;


create or replace function public.advance_round_to_final_if_ready(
  p_round_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_round public.rounds;
  unresolved_players integer;
begin
  select *
  into target_round
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    return;
  end if;

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
end;
$$;

revoke all on function
  public.advance_round_to_final_if_ready(uuid)
from public;


create or replace function public.request_recording_retry(
  p_round_id uuid,
  p_player_id uuid
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
  first_recording public.recordings;
begin
  if auth.uid() is null then
    raise exception using
      errcode = 'P0001',
      message = 'SESSION_EXPIRED';
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

  select *
  into first_recording
  from public.recordings
  where round_id = target_round.id
    and player_id = target_player.id
    and attempt = 1
    and status in ('READY', 'VALIDATED')
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'RECORDING_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.recordings r
    where r.round_id = target_round.id
      and r.player_id = target_player.id
      and r.attempt = 2
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'RETRY_ALREADY_USED';
  end if;

  update public.recordings
  set
    status = 'REPLACED',
    validated_at = null
  where id = first_recording.id;

  update public.players
  set round_status = 'RECORDING'
  where id = target_player.id;

  update public.rounds
  set state = 'RECORDING'
  where id = target_round.id;

  update public.lobbies
  set state = 'RECORDING'
  where id = target_lobby.id;

  return public.build_lobby_snapshot(
    target_lobby.id,
    auth.uid()
  );
end;
$$;

revoke all on function
  public.request_recording_retry(uuid, uuid)
from public;

grant execute on function
  public.request_recording_retry(uuid, uuid)
to authenticated;
