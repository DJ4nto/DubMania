export type RecordingStatus =
  | 'UPLOADING'
  | 'READY'
  | 'VALIDATED'
  | 'REPLACED'
  | 'FAILED';

export interface RoundRecording {
  id: string;
  roundId: string;
  playerId: string;
  attempt: 1 | 2;
  status: RecordingStatus;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  startOffsetMs: number;
  endOffsetMs: number | null;
  createdAt: string;
  validatedAt: string | null;
}
