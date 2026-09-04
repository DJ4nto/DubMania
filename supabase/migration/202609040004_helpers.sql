create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version := old.version + 1;
  return new;
end;
$$;

create trigger lobbies_touch_updated_at
before update on public.lobbies
for each row
execute function public.touch_updated_at();

create or replace function public.get_server_time()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'epoch_ms',
    floor(
      extract(epoch from clock_timestamp()) * 1000
    )::bigint
  );
$$;

grant execute on function public.get_server_time()
to authenticated;

create or replace function public.is_lobby_member(
  target_lobby_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.players p
    where p.lobby_id = target_lobby_id
      and p.user_id = auth.uid()
      and p.left_at is null
  );
$$;

create or replace function public.is_lobby_host(
  target_lobby_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lobbies l
    join public.players p
      on p.id = l.host_player_id
    where l.id = target_lobby_id
      and p.user_id = auth.uid()
      and p.left_at is null
  );
$$;

revoke all on function public.is_lobby_member(uuid)
from public;

revoke all on function public.is_lobby_host(uuid)
from public;

grant execute on function public.is_lobby_member(uuid)
to authenticated;

grant execute on function public.is_lobby_host(uuid)
to authenticated;
