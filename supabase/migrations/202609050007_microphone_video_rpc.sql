create or replace function public.update_microphone_state(
  p_player_id uuid,
  p_microphone_state public.microphone_state
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_player public.players;
begin
  update public.players
  set
    microphone_state = p_microphone_state,
    round_status = case
      when p_microphone_state in ('DENIED', 'UNAVAILABLE')
        then 'NO_MIC'::public.player_round_status
      when round_status = 'NO_MIC'
        then 'IDLE'::public.player_round_status
      else round_status
    end,
    connected = true,
    last_seen_at = now()
  where id = p_player_id
    and user_id = auth.uid()
    and left_at is null
  returning * into target_player;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'NOT_LOBBY_MEMBER';
  end if;

  return jsonb_build_object(
    'playerId', target_player.id,
    'microphoneState', target_player.microphone_state,
    'roundStatus', target_player.round_status,
    'serverTime', clock_timestamp()
  );
end;
$$;

revoke all on function
  public.update_microphone_state(
    uuid,
    public.microphone_state
  )
from public;

grant execute on function
  public.update_microphone_state(
    uuid,
    public.microphone_state
  )
to authenticated;

create or replace function public.select_lobby_video(
  p_lobby_id uuid,
  p_video jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  youtube_id text;
  video_title text;
  video_source text;
  target_lobby public.lobbies;
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

  if p_video is null
     or jsonb_typeof(p_video) <> 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_VIDEO';
  end if;

  youtube_id := p_video ->> 'youtubeId';
  video_title := p_video ->> 'title';
  video_source := p_video ->> 'source';

  if youtube_id is null
     or youtube_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_VIDEO';
  end if;

  if video_title is null
     or char_length(btrim(video_title)) < 1
     or char_length(video_title) > 160 then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_VIDEO';
  end if;

  if video_source not in ('catalog', 'manual') then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_VIDEO';
  end if;

  update public.lobbies
  set selected_video = p_video
  where id = p_lobby_id;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function
  public.select_lobby_video(uuid, jsonb)
from public;

grant execute on function
  public.select_lobby_video(uuid, jsonb)
to authenticated;

create or replace function public.clear_lobby_video(
  p_lobby_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lobby public.lobbies;
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

  if target_lobby.state <> 'VIDEO_SELECTION' then
    raise exception using
      errcode = 'P0001',
      message = 'INVALID_GAME_STATE';
  end if;

  update public.lobbies
  set selected_video = null
  where id = p_lobby_id;

  return public.build_lobby_snapshot(
    p_lobby_id,
    auth.uid()
  );
end;
$$;

revoke all on function public.clear_lobby_video(uuid)
from public;

grant execute on function public.clear_lobby_video(uuid)
to authenticated;
