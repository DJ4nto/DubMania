export type LobbyState =
  | 'VIDEO_SELECTION'
  | 'PREPARING'
  | 'COUNTDOWN'
  | 'RECORDING'
  | 'REVIEW'
  | 'FINAL_READY'
  | 'FINAL_PLAYBACK';

export type RoundState = Exclude<LobbyState, 'VIDEO_SELECTION'>;

export type MicrophoneState =
  | 'UNKNOWN'
  | 'AVAILABLE'
  | 'DENIED'
  | 'UNAVAILABLE';

export type PlayerRoundStatus =
  | 'IDLE'
  | 'PREPARING'
  | 'READY'
  | 'RECORDING'
  | 'UPLOADING'
  | 'REVIEWING'
  | 'VALIDATED'
  | 'NO_MIC'
  | 'ABANDONED'
  | 'DISCONNECTED'
  | 'FAILED';

export const ALLOWED_TRANSITIONS: Readonly<
  Record<LobbyState, readonly LobbyState[]>
> = {
  VIDEO_SELECTION: ['PREPARING'],
  PREPARING: ['COUNTDOWN', 'VIDEO_SELECTION'],
  COUNTDOWN: ['RECORDING', 'VIDEO_SELECTION'],
  RECORDING: ['REVIEW'],
  REVIEW: ['FINAL_READY'],
  FINAL_READY: ['FINAL_PLAYBACK', 'VIDEO_SELECTION'],
  FINAL_PLAYBACK: ['FINAL_PLAYBACK', 'VIDEO_SELECTION'],
};
