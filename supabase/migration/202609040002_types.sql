create type public.lobby_state as enum (
  'VIDEO_SELECTION',
  'PREPARING',
  'COUNTDOWN',
  'RECORDING',
  'REVIEW',
  'FINAL_READY',
  'FINAL_PLAYBACK'
);

create type public.microphone_state as enum (
  'UNKNOWN',
  'AVAILABLE',
  'DENIED',
  'UNAVAILABLE'
);

create type public.player_round_status as enum (
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
  'FAILED'
);

create type public.recording_status as enum (
  'UPLOADING',
  'READY',
  'VALIDATED',
  'REPLACED',
  'FAILED'
);
