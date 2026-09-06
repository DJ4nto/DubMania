-- Supprime d'abord l'ancien index s'il existe,
-- ce qui rend la migration réexécutable en développement.
drop index if exists
  public.players_unique_active_nickname_idx;

-- Un pseudo est unique, sans tenir compte de la casse,
-- parmi les joueurs qui n'ont pas quitté le lobby.
create unique index
  players_unique_active_nickname_idx
on public.players (
  lobby_id,
  lower(btrim(nickname))
)
where left_at is null;
