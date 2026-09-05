import type { RoundState } from './game';
import type { SelectedVideo } from './video';

export interface GameRound {
  id: string;
  lobbyId: string;
  sequenceNumber: number;
  video: SelectedVideo;
  state: RoundState;
  scheduledStartAt: string | null;
  recordingDeadlineAt: string | null;
  reviewDeadlineAt: string | null;
  finalPlaybackAt: string | null;
  createdAt: string;
  finishedAt: string | null;
}
