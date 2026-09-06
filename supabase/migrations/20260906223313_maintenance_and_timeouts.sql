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
      clock_timestamp() - interval '30 seconds'
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
      clock_timestamp() - interval '30 seconds'
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
    where id = target_round.id
      and state in (
        'RECORDING',
        'REVIEW',
        'FINAL_READY'
      );

    update public.lobbies
    set state = 'FINAL_READY'
    where id = target_round.lobby_id
      and state in (
        'RECORDING',
        'REVIEW',
        'FINAL_READY'
      );
  end if;
end;
$$;

revoke all on function
  public.advance_round_to_final_if_ready(uuid)
from public;


create or replace function public.run_game_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_time constant timestamptz :=
    clock_timestamp();

  stale_player_count integer := 0;
  transferred_host_count integer := 0;
  recording_timeout_count integer := 0;
  review_timeout_count integer := 0;

  target_lobby record;
  target_round record;
begin
  /*
   * 1. Marquer les connexions obsolètes.
   */
  with stale_players as (
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
          then 'DISCONNECTED'::public.player_round_status
        else round_status
      end
    where left_at is null
      and connected = true
      and last_seen_at <
        current_time - interval '30 seconds'
    returning id
  )
  select count(*)
  into stale_player_count
  from stale_players;

  /*
   * 2. Réattribuer les lobbies dont le host est absent.
   */
  for target_lobby in
    select l.id
    from public.lobbies l
    left join public.players host_player
      on host_player.id = l.host_player_id
    where l.host_player_id is null
       or host_player.id is null
       or host_player.left_at is not null
       or host_player.connected = false
       or host_player.last_seen_at <
         current_time - interval '30 seconds'
    for update of l skip locked
  loop
    perform public.transfer_lobby_host(
      target_lobby.id
    );

    transferred_host_count :=
      transferred_host_count + 1;
  end loop;

  /*
   * 3. Terminer les enregistrements dépassant leur deadline.
   *
   * On ne peut pas arrêter un MediaRecorder distant depuis SQL.
   * On marque donc les joueurs encore non résolus comme FAILED,
   * ce qui permet à la partie de continuer.
   */
  for target_round in
    select r.id, r.lobby_id
    from public.rounds r
    join public.lobbies l
      on l.current_round_id = r.id
    where r.state = 'RECORDING'
      and r.recording_deadline_at is not null
      and r.recording_deadline_at < current_time
    for update of r skip locked
  loop
    with failed_players as (
      update public.players
      set round_status =
        'FAILED'::public.player_round_status
      where lobby_id = target_round.lobby_id
        and left_at is null
        and round_status in (
          'PREPARING',
          'READY',
          'RECORDING',
          'UPLOADING'
        )
      returning id
    )
    select
      recording_timeout_count + count(*)
    into recording_timeout_count
    from failed_players;

    perform public.advance_round_to_review_if_ready(
      target_round.id
    );

    perform public.advance_round_to_final_if_ready(
      target_round.id
    );
  end loop;

  /*
   * 4. Fermer la review après sa deadline.
   */
  for target_round in
    select r.id, r.lobby_id
    from public.rounds r
    join public.lobbies l
      on l.current_round_id = r.id
    where r.state = 'REVIEW'
      and r.review_deadline_at is not null
      and r.review_deadline_at < current_time
    for update of r skip locked
  loop
    with abandoned_players as (
      update public.players
      set round_status =
        'ABANDONED'::public.player_round_status
      where lobby_id = target_round.lobby_id
        and left_at is null
        and round_status = 'REVIEWING'
      returning id
    )
    select
      review_timeout_count + count(*)
    into review_timeout_count
    from abandoned_players;

    perform public.advance_round_to_final_if_ready(
      target_round.id
    );
  end loop;

  return jsonb_build_object(
    'ranAt', current_time,
    'stalePlayers', stale_player_count,
    'transferredHosts', transferred_host_count,
    'recordingTimeouts', recording_timeout_count,
    'reviewTimeouts', review_timeout_count
  );
end;
$$;

revoke all on function
  public.run_game_maintenance()
from public;

grant execute on function
  public.run_game_maintenance()
to service_role;

