import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { loadYouTubeApi } from '../lib/youtubeApi';
import type {
  YouTubePlayerEvent,
  YouTubePlayerInstance,
} from '../types/youtube';

export type YouTubeStatus =
  | 'LOADING_API'
  | 'CREATING'
  | 'CUED'
  | 'PLAYING'
  | 'BUFFERING'
  | 'PAUSED'
  | 'ENDED'
  | 'ERROR';

interface UseYouTubePlayerOptions {
  youtubeId: string;
  onPlaying?: (
    currentTimeSeconds: number,
    performanceTimeMs: number,
  ) => void;
  onEnded?: (currentTimeSeconds: number) => void;
}

export function useYouTubePlayer({
  youtubeId,
  onPlaying,
  onEnded,
}: UseYouTubePlayerOptions) {
  const containerRef = useRef<HTMLDivElement | null>(
    null,
  );
  const playerRef =
    useRef<YouTubePlayerInstance | null>(null);
  const onPlayingRef = useRef(onPlaying);
  const onEndedRef = useRef(onEnded);
  const firstPlayingReportedRef = useRef(false);

  const [status, setStatus] =
    useState<YouTubeStatus>('LOADING_API');
  const [error, setError] = useState<string | null>(
    null,
  );
  const prepareReplay = useCallback(() => {
    firstPlayingReportedRef.current = false;

    const player = playerRef.current;

    if (!player) return;

    player.pauseVideo();
    player.seekTo(0, true);
    player.cueVideoById(youtubeId);
    setStatus('CUED');
    }, [youtubeId]);


  useEffect(() => {
    onPlayingRef.current = onPlaying;
  }, [onPlaying]);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let active = true;
    setStatus('LOADING_API');
    setError(null);
    firstPlayingReportedRef.current = false

    loadYouTubeApi()
      .then((YT) => {
        if (!active || !containerRef.current) return;

        setStatus('CREATING');

        const player = new YT.Player(
          containerRef.current,
          {
            videoId: youtubeId,
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                event.target.cueVideoById(youtubeId);
                event.target.seekTo(0, true);
                setStatus('CUED');
              },
              onStateChange: (
                event: YouTubePlayerEvent,
              ) => {
                switch (event.data) {
                  case YT.PlayerState.PLAYING:
                  setStatus('PLAYING');

                  if (!firstPlayingReportedRef.current) {
                    firstPlayingReportedRef.current = true;

                    onPlayingRef.current?.(
                    event.target.getCurrentTime(),
                    performance.now(),
                    );
                  }

                    break;

                  case YT.PlayerState.BUFFERING:
                    setStatus('BUFFERING');
                    break;

                  case YT.PlayerState.PAUSED:
                    setStatus('PAUSED');
                    break;

                  case YT.PlayerState.CUED:
                    setStatus('CUED');
                    break;

                  case YT.PlayerState.ENDED:
                    setStatus('ENDED');
                    onEndedRef.current?.(
                      event.target.getCurrentTime(),
                    );
                    break;
                }
              },
              onError: () => {
                setStatus('ERROR');
                setError(
                  'Cette vidéo est privée, supprimée ou ne peut pas être intégrée.',
                );
              },
              onAutoplayBlocked: () => {
                setError(
                  'Le navigateur a bloqué le démarrage automatique. Clique à nouveau sur “Prêt”.',
                );
              },
            },
          },
        );

        playerRef.current = player;
      })
      .catch((caughtError) => {
        if (!active) return;

        setStatus('ERROR');
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Le lecteur YouTube ne peut pas être chargé.',
        );
      });

    return () => {
      active = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeId]);

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const reset = useCallback(() => {
    const player = playerRef.current;

    if (!player) return;

    player.pauseVideo();
    player.seekTo(0, true);
    player.cueVideoById(youtubeId);
  }, [youtubeId]);

    return {
    containerRef,
    playerRef,
    status,
    error,
    play,
    reset,
    prepareReplay,
    isReady:
        status === 'CUED' ||
        status === 'PAUSED' ||
        status === 'PLAYING',
    };
}