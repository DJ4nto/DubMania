create or replace function public.schedule_final_playback(
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
  scheduled_time timestamptz;
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
  for update;

  if not found
     or target_lobby.current_round_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'ROUND_NOT_FOUND';
  end if;

  select *
  into target_round
  from public.rounds
  where id = target_lobby.current_round_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'ROUND_NOT_FOUND';
  end if;

  if target_lobby.state not in (
    'FINAL_READY',
    'FINAL_PLAYBACK'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  scheduled_time :=
    clock_timestamp() + interval '3 seconds';

  update public.rounds
  set
    state = 'FINAL_PLAYBACK',
    final_playback_at = scheduled_time
  where id = target_round.id;

  update public.lobbies
  set state = 'FINAL_PLAYBACK'
  where id = p_lobby_id;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function
  public.schedule_final_playback(uuid)
from public;

grant execute on function
  public.schedule_final_playback(uuid)
to authenticated;


create or replace function public.return_to_video_selection(
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
  catalog_video_id text;
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
    'FINAL_READY',
    'FINAL_PLAYBACK'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  if target_lobby.current_round_id is not null then
    select *
    into target_round
    from public.rounds
    where id = target_lobby.current_round_id
    for update;

    if found then
      catalog_video_id :=
        target_round.video ->> 'catalogId';

      if catalog_video_id is not null then
        insert into public.played_videos (
          lobby_id,
          catalog_video_id
        )
        values (
          p_lobby_id,
          catalog_video_id
        )
        on conflict (lobby_id, catalog_video_id)
        do update set played_at = now();
      end if;

      update public.rounds
      set finished_at = now()
      where id = target_round.id;
    end if;
  end if;

  update public.players
  set round_status = case
    when microphone_state in (
      'DENIED',
      'UNAVAILABLE'
    )
      then 'NO_MIC'::public.player_round_status
    else 'IDLE'::public.player_round_status
  end
  where lobby_id = p_lobby_id
    and left_at is null;

  update public.lobbies
  set
    state = 'VIDEO_SELECTION',
    current_round_id = null,
    selected_video = null
  where id = p_lobby_id;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function
  public.return_to_video_selection(uuid)
from public;

grant execute on function
  public.return_to_video_selection(uuid)
to authenticated;
