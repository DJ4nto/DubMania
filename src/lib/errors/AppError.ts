export type AppErrorCode =
  | 'INVALID_NICKNAME'
  | 'INVALID_CODE'
  | 'LOBBY_NOT_FOUND'
  | 'LOBBY_FULL'
  | 'SESSION_EXPIRED'
  | 'NOT_LOBBY_MEMBER'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR'
  | 'NICKNAME_TAKEN'
  | 'HOST_ONLY'
  | 'INVALID_GAME_STATE'
  | 'INVALID_VIDEO'
  | 'MICROPHONE_DENIED'
  | 'MICROPHONE_UNAVAILABLE'
  | 'MICROPHONE_IN_USE'
  | 'UNSUPPORTED_BROWSER'
  | 'VIDEO_REQUIRED'
  | 'ROUND_NOT_FOUND'
  | 'PLAYERS_NOT_READY'
  | 'ROUND_NOT_STARTED_YET'
  | 'YOUTUBE_UNAVAILABLE'
  | 'INVALID_RECORDING_ATTEMPT'
  | 'INVALID_RECORDING'
  | 'INVALID_RECORDING_PATH'
  | 'RECORDING_NOT_FOUND'
  | 'UPLOAD_FAILED'
  | 'RETRY_ALREADY_USED'
  | 'FINAL_PLAYBACK_NOT_READY'
  | 'AUDIO_DECODE_FAILED';


export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
  }
}
