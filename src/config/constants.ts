export const MAX_PLAYERS = 4;
export const LOBBY_CODE_LENGTH = 4;
export const HEARTBEAT_INTERVAL_MS = 10_000;
export const DISCONNECT_AFTER_MS = 30_000;
export const START_LEAD_TIME_MS = 5_000;
export const COUNTDOWN_SECONDS = 3;
export const REVIEW_TIMEOUT_MS = 120_000;
export const RECORDING_END_GRACE_MS = 4_000;
export const MAX_RECORDING_ATTEMPTS = 2;
export const AUDIO_BITS_PER_SECOND = 64_000;
export const FINAL_SYNC_POLL_MS = 250;
export const FINAL_HARD_RESYNC_THRESHOLD_MS = 180;
export const FINAL_SOFT_DRIFT_THRESHOLD_MS = 70;

export const PLAYER_COLORS = {
  1: '#FF3131',
  2: '#00BF63',
  3: '#004AAD',
  4: '#FFBD59',
} as const;

/**
 * Marge ajoutée après la durée déclarée dans videos.json.
 * Elle laisse le temps à YouTube de terminer après un léger
 * buffering sans couper la dernière phrase trop tôt.
 */
export const RECORDING_DURATION_GRACE_MS = 2_500;

/**
 * Limite de sécurité pour une vidéo manuelle dont la durée
 * n'est pas connue dans le catalogue.
 */
export const MAX_MANUAL_RECORDING_DURATION_MS =
  10 * 60 * 1_000;
