import {
  ALLOWED_TRANSITIONS,
  type LobbyState,
} from '../../types/game';

export function canTransition(
  from: LobbyState,
  to: LobbyState,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: LobbyState,
  to: LobbyState,
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Transition de partie interdite : ${from} → ${to}.`,
    );
  }
}
