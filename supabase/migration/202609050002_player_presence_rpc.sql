create or replace function public.transfer_lobby_host(
  target_lobby_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_player_id uuid;
begin
  select p.id
  into selected_player_id
  from public.players p
  where p.lobby_id = target_lobby_id
    and p.left_at is null
    and p.connected = true
    and p.last_seen_at >
      now() - interval '30 seconds'
  order by p.slot, p.joined_at
  limit 1;

  if selected_player_id is null then
    select p.id
    into selected_player_id
    from public.players p
    where p.lobby_id = target_lobby_id
      and p.left_at is null
    order by p.last_seen_at desc, p.slot
    limit 1;
  end if;

  update public.lobbies
  set host_player_id = selected_player_id
  where id = target_lobby_id;

  return selected_player_id;
end;
$$;

revoke all on function public.transfer_lobby_host(uuid)
from public;

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
begin
  update public.players
  set
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
    'serverTime', clock_timestamp()
  );
end;
$$;

revoke all on function public.heartbeat_player(uuid)
from public;

grant execute on function public.heartbeat_player(uuid)
to authenticated;

create or replace function public.leave_lobby(
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
  remaining_players integer;
  new_host_id uuid;
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
  where id = target_player.lobby_id
  for update;

  update public.players
  set
    connected = false,
    left_at = now(),
    last_seen_at = now(),
    round_status = 'ABANDONED'
  where id = target_player.id;

  select count(*)
  into remaining_players
  from public.players
  where lobby_id = target_lobby.id
    and left_at is null;

  if remaining_players = 0 then
    delete from public.lobbies
    where id = target_lobby.id;

    return jsonb_build_object(
      'lobbyDeleted', true,
      'newHostPlayerId', null
    );
  end if;

  if target_lobby.host_player_id = target_player.id then
    new_host_id :=
      public.transfer_lobby_host(target_lobby.id);
  else
    new_host_id := target_lobby.host_player_id;
  end if;

  return jsonb_build_object(
    'lobbyDeleted', false,
    'newHostPlayerId', new_host_id
  );
end;
$$;

revoke all on function public.leave_lobby(uuid)
from public;

grant execute on function public.leave_lobby(uuid)
to authenticated;

create or replace function public.mark_stale_players()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_count integer := 0;
  affected_lobby record;
begin
  with updated as (
    update public.players
    set
      connected = false,
      round_status = case
        when round_status in (
          'PREPARING',
          'READY',
          'RECORDING',
          'UPLOADING',
          'REVIEWING'
        )
        then 'DISCONNECTED'
        else round_status
      end
    where connected = true
      and left_at is null
      and last_seen_at <
        now() - interval '30 seconds'
    returning lobby_id
  )
  select count(*)
  into affected_count
  from updated;

  for affected_lobby in
    select distinct l.id
    from public.lobbies l
    left join public.players host_player
      on host_player.id = l.host_player_id
    where l.host_player_id is null
       or host_player.left_at is not null
       or host_player.connected = false
       or host_player.last_seen_at <
         now() - interval '30 seconds'
  loop
    perform public.transfer_lobby_host(
      affected_lobby.id
    );
  end loop;

  return affected_count;
end;
$$;

revoke all on function public.mark_stale_players()
from public;
