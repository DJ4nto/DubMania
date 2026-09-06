create or replace function public.heartbeat_player(
  p_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_player public.players;
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
  into target_lobby
  from public.lobbies
  where id = target_player.lobby_id;

  update public.players
  set
    connected = true,
    last_seen_at = now(),
    round_status = case
      when target_player.round_status <>
        'DISCONNECTED'
        then target_player.round_status

      when target_lobby.state = 'VIDEO_SELECTION'
        and target_player.microphone_state in (
          'DENIED',
          'UNAVAILABLE'
        )
        then 'NO_MIC'::public.player_round_status

      when target_lobby.state = 'VIDEO_SELECTION'
        then 'IDLE'::public.player_round_status

      /*
       * Une reconnexion pendant la manche ne réinscrit pas
       * rétroactivement le joueur dans l’enregistrement.
       * Il attend la manche suivante.
       */
      else 'ABANDONED'::public.player_round_status
    end
  where id = target_player.id
  returning * into target_player;

  return jsonb_build_object(
    'playerId', target_player.id,
    'serverTime', clock_timestamp(),
    'roundStatus', target_player.round_status
  );
end;
$$;

revoke all on function
  public.heartbeat_player(uuid)
from public;

grant execute on function
  public.heartbeat_player(uuid)
to authenticated;
