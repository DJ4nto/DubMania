import type {
  LobbyState,
  MicrophoneState,
  PlayerRoundStatus,
} from './game';
import type { SelectedVideo } from './video';
import type { GameRound } from './round';
import type { RoundRecording } from './recording';

export type PlayerSlot = 1 | 2 | 3 | 4;

export interface LobbyPlayer {
  id: string;
  lobbyId: string;
  userId: string;
  nickname: string;
  slot: PlayerSlot;
  connected: boolean;
  microphoneState: MicrophoneState;
  roundStatus: PlayerRoundStatus;
  lastSeenAt: string;
  joinedAt: string;
  leftAt: string | null;
  isHost: boolean;
}

export interface Lobby {
  id: string;
  code: string;
  hostPlayerId: string;
  state: LobbyState;
  currentRoundId: string | null;
  selectedVideo: SelectedVideo | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface LobbySnapshot {
  lobby: Lobby;
  players: LobbyPlayer[];
  currentPlayerId: string;
  round: GameRound | null;
  recordings: RoundRecording[];
  serverTime: string;
}

export interface StoredLobbySession {
  lobbyId: string;
  lobbyCode: string;
  playerId: string;
}
