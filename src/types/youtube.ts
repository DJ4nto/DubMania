export interface YouTubePlayerInstance {
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoLoadedFraction(): number;
  mute(): void;
  unMute(): void;
  setVolume(volume: number): void;
  destroy(): void;
}

export interface YouTubePlayerEvent {
  target: YouTubePlayerInstance;
  data: number;
}

export interface YouTubePlayerOptions {
  videoId?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: YouTubePlayerEvent) => void;
    onAutoplayBlocked?: (
      event: YouTubePlayerEvent,
    ) => void;
  };
}

export interface YouTubeNamespace {
  Player: new (
    element: HTMLElement | string,
    options: YouTubePlayerOptions,
  ) => YouTubePlayerInstance;
  PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}
