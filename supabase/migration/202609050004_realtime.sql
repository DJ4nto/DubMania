do $$
begin
  alter publication supabase_realtime
    add table public.lobbies;
exception
  when duplicate_object then
    null;
end
$$;

do $$
begin
  alter publication supabase_realtime
    add table public.players;
exception
  when duplicate_object then
    null;
end
$$;

do $$
begin
  alter publication supabase_realtime
    add table public.rounds;
exception
  when duplicate_object then
    null;
end
$$;

do $$
begin
  alter publication supabase_realtime
    add table public.recordings;
exception
  when duplicate_object then
    null;
end
$$;

alter table public.lobbies
  replica identity full;

alter table public.players
  replica identity full;

alter table public.rounds
  replica identity full;

alter table public.recordings
  replica identity full;
