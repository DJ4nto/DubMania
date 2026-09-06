create or replace function public.get_expired_lobbies_for_cleanup(
  p_limit integer default 25
)
returns table (
  lobby_id uuid,
  storage_paths text[]
)
language sql
security definer
set search_path = ''
as $$
  select
    l.id as lobby_id,
    coalesce(
      array_agg(r.storage_path)
        filter (where r.storage_path is not null),
      array[]::text[]
    ) as storage_paths
  from public.lobbies l
  left join public.rounds game_round
    on game_round.lobby_id = l.id
  left join public.recordings r
    on r.round_id = game_round.id
  where
    l.expires_at < clock_timestamp()
    or (
      l.updated_at <
        clock_timestamp() - interval '30 minutes'
      and not exists (
        select 1
        from public.players active_player
        where active_player.lobby_id = l.id
          and active_player.left_at is null
          and active_player.connected = true
          and active_player.last_seen_at >
            clock_timestamp() - interval '30 seconds'
      )
    )
  group by l.id, l.updated_at
  order by l.updated_at
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function
  public.get_expired_lobbies_for_cleanup(integer)
from public;

grant execute on function
  public.get_expired_lobbies_for_cleanup(integer)
to service_role;


create or replace function public.delete_cleaned_lobby(
  p_lobby_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.lobbies
  where id = p_lobby_id
    and (
      expires_at < clock_timestamp()
      or not exists (
        select 1
        from public.players active_player
        where active_player.lobby_id =
          public.lobbies.id
          and active_player.left_at is null
          and active_player.connected = true
          and active_player.last_seen_at >
            clock_timestamp() - interval '30 seconds'
      )
    );

  get diagnostics deleted_count = row_count;

  return deleted_count > 0;
end;
$$;

revoke all on function
  public.delete_cleaned_lobby(uuid)
from public;

grant execute on function
  public.delete_cleaned_lobby(uuid)
to service_role;
