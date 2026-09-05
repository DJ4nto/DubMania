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
