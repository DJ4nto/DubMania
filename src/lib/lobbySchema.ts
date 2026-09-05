import { z } from 'zod';
import { requiredPlayersSchema } from '../types/video';

const lobbyStateSchema = z.enum([
  'VIDEO_SELECTION',
  'PREPARING',
  'COUNTDOWN',
  'RECORDING',
  'REVIEW',
  'FINAL_READY',
  'FINAL_PLAYBACK',
]);

const roundStateSchema = z.enum([
  'PREPARING',
  'COUNTDOWN',
  'RECORDING',
  'REVIEW',
  'FINAL_READY',
  'FINAL_PLAYBACK',
]);

const microphoneStateSchema = z.enum([
  'UNKNOWN',
  'AVAILABLE',
  'DENIED',
  'UNAVAILABLE',
]);

const roundStatusSchema = z.enum([
  'IDLE',
  'PREPARING',
  'READY',
  'RECORDING',
  'UPLOADING',
  'REVIEWING',
  'VALIDATED',
  'NO_MIC',
  'ABANDONED',
  'DISCONNECTED',
  'FAILED',
]);

const selectedVideoSchema = z.object({
  source: z.enum(['catalog', 'manual']),
  catalogId: z.string().nullable(),
  youtubeId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string(),
  thumbnail: z.string(),
  description: z.string(),
  requiredPlayers: requiredPlayersSchema.nullable(),
  category: z.string().nullable(),
  duration: z.number().nullable(),
});

const roundSchema = z.object({
  id: z.string().uuid(),
  lobbyId: z.string().uuid(),
  sequenceNumber: z.number().int().positive(),
  video: selectedVideoSchema,
  state: roundStateSchema,
  scheduledStartAt: z.string().nullable(),
  recordingDeadlineAt: z.string().nullable(),
  reviewDeadlineAt: z.string().nullable(),
  finalPlaybackAt: z.string().nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
});

const lobbyPlayerSchema = z.object({
  id: z.string().uuid(),
  lobbyId: z.string().uuid(),
  userId: z.string().uuid(),
  nickname: z.string(),
  slot: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  connected: z.boolean(),
  microphoneState: microphoneStateSchema,
  roundStatus: roundStatusSchema,
  lastSeenAt: z.string(),
  joinedAt: z.string(),
  leftAt: z.string().nullable(),
  isHost: z.boolean(),
});

const lobbySchema = z.object({
  id: z.string().uuid(),
  code: z.string().length(4),
  hostPlayerId: z.string().uuid(),
  state: lobbyStateSchema,
  currentRoundId: z.string().uuid().nullable(),
  selectedVideo: selectedVideoSchema.nullable(),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
});

const recordingSchema = z.object({
  id: z.string().uuid(),
  roundId: z.string().uuid(),
  playerId: z.string().uuid(),
  attempt: z.union([
    z.literal(1),
    z.literal(2),
  ]),
  status: z.enum([
    'UPLOADING',
    'READY',
    'VALIDATED',
    'REPLACED',
    'FAILED',
  ]),
  storagePath: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  durationMs: z.number(),
  startOffsetMs: z.number(),
  endOffsetMs: z.number().nullable(),
  createdAt: z.string(),
  validatedAt: z.string().nullable(),
});

export const lobbySnapshotSchema = z.object({
  lobby: lobbySchema,
  players: z.array(lobbyPlayerSchema),
  currentPlayerId: z.string().uuid(),
  round: roundSchema.nullable(),
  recordings: z.array(recordingSchema),
  serverTime: z.string(),
});
