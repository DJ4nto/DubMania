alter table public.lobbies enable row level security;
alter table public.players enable row level security;
alter table public.rounds enable row level security;
alter table public.recordings enable row level security;
alter table public.played_videos enable row level security;

revoke all on public.lobbies from anon, authenticated;
revoke all on public.players from anon, authenticated;
revoke all on public.rounds from anon, authenticated;
revoke all on public.recordings from anon, authenticated;
revoke all on public.played_videos from anon, authenticated;

grant select on public.lobbies to authenticated;
grant select on public.players to authenticated;
grant select on public.rounds to authenticated;
grant select on public.recordings to authenticated;
grant select on public.played_videos to authenticated;

drop policy if exists lobbies_select_for_members
on public.lobbies;

create policy lobbies_select_for_members
on public.lobbies
for select
to authenticated
using (
  public.is_lobby_member(id)
);

drop policy if exists players_select_for_lobby_members
on public.players;

create policy players_select_for_lobby_members
on public.players
for select
to authenticated
using (
  public.is_lobby_member(lobby_id)
);

drop policy if exists rounds_select_for_lobby_members
on public.rounds;

create policy rounds_select_for_lobby_members
on public.rounds
for select
to authenticated
using (
  public.is_lobby_member(lobby_id)
);

drop policy if exists recordings_select_for_lobby_members
on public.recordings;

create policy recordings_select_for_lobby_members
on public.recordings
for select
to authenticated
using (
  exists (
    select 1
    from public.rounds r
    where r.id = recordings.round_id
      and public.is_lobby_member(r.lobby_id)
  )
);

drop policy if exists played_videos_select_for_members
on public.played_videos;

create policy played_videos_select_for_members
on public.played_videos
for select
to authenticated
using (
  public.is_lobby_member(lobby_id)
);
