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
    'round',
    (
      select jsonb_build_object(
        'id', r.id,
        'lobbyId', r.lobby_id,
        'sequenceNumber', r.sequence_number,
        'video', r.video,
        'state', r.state,
        'scheduledStartAt', r.scheduled_start_at,
        'recordingDeadlineAt', r.recording_deadline_at,
        'reviewDeadlineAt', r.review_deadline_at,
        'finalPlaybackAt', r.final_playback_at,
        'createdAt', r.created_at,
        'finishedAt', r.finished_at
      )
      from public.rounds r
      where r.id = l.current_round_id
    ),
    'serverTime',
    clock_timestamp()
  )
  from public.lobbies l
  where l.id = target_lobby_id;
$$;

revoke all on function
  public.build_lobby_snapshot(uuid, uuid)
from public;

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
     or p_size_bytes > 10485760
     or p_duration_ms <= 0
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

  if p_attempt = 1 and exists (
    select 1
    from public.recordings existing
    where existing.round_id = target_round.id
      and existing.player_id = target_player.id
      and existing.attempt = 2
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'RETRY_ALREADY_USED';
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

  if p_attempt = 2 then
    update public.recordings
    set
      status = 'REPLACED',
      validated_at = null
    where round_id = target_round.id
      and player_id = target_player.id
      and attempt = 1;
  end if;

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
begin
  select r.*
  into target_recording
  from public.recordings r
  join public.players p
    on p.id = r.player_id
  where r.id = p_recording_id
    and p.user_id = auth.uid()
    and p.left_at is null
    and r.status = 'READY'
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
      else null
    end
  where round_id = target_recording.round_id
    and player_id = target_recording.player_id;

  update public.players
  set round_status = 'VALIDATED'
  where id = target_player.id;

  perform public.advance_round_to_final_if_ready(
    target_round.id
  );

  return public.build_lobby_snapshot(
    target_round.lobby_id,
    auth.uid()
  );
end;
$$;


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

  perform public.advance_round_to_review_if_ready(
    target_round.id
  );

  perform public.advance_round_to_final_if_ready(
    target_round.id
  );

  return public.build_lobby_snapshot(
    target_round.lobby_id,
    auth.uid()
  );
end;
$$;
