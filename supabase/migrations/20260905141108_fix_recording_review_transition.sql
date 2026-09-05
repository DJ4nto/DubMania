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
      'READY',
      'PREPARING',
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
      and state = 'RECORDING';

    update public.lobbies
    set state = 'REVIEW'
    where id = target_round.lobby_id
      and state = 'RECORDING';
  end if;
end;
$$;

revoke all on function
  public.advance_round_to_review_if_ready(uuid)
from public;
