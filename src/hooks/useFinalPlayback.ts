import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  audioService,
  type LoadedVoiceTrack,
  type PlaybackVoiceTrack,
} from '../services/AudioService';
import { synchronizationService } from '../services/SynchronizationService';
import {
  FINAL_HARD_RESYNC_THRESHOLD_MS,
  FINAL_SYNC_POLL_MS,
} from '../config/constants';
import type { LobbySnapshot } from '../types/lobby';

function isAudioContextClosed(
  context: AudioContext,
): boolean {
  return context.state === 'closed';
}

interface UseFinalPlaybackOptions {
  snapshot: LobbySnapshot;
  playYouTube: () => void;
  resetYouTube: () => void;
  getYouTubeTime: () => number;
  getYouTubeState: () => number | null;
}

export function useFinalPlayback({
  snapshot,
  playYouTube,
  resetYouTube,
  getYouTubeTime,
  getYouTubeState,
}: UseFinalPlaybackOptions) {
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );
  const [volumes, setVolumes] = useState<
    Record<string, number>
  >({});

  const contextRef = useRef<AudioContext | null>(null);
  const loadedTracksRef =
    useRef<LoadedVoiceTrack[]>([]);
  const playbackTracksRef =
    useRef<PlaybackVoiceTrack[]>([]);
  const volumesRef = useRef<Record<string, number>>({});
  const scheduledPlaybackRef = useRef<string | null>(
    null,
  );
  const syncIntervalRef = useRef<number | null>(null);
  const contextStartRef = useRef<number | null>(null);
  const videoStartPositionRef = useRef(0);
  const lastResyncAtRef = useRef(0);
  const playingRef = useRef(false);

  const validatedRecordings =
    snapshot.recordings.filter(
      (recording) =>
        recording.status === 'VALIDATED',
    );

  const clearSyncInterval = useCallback(() => {
    if (syncIntervalRef.current !== null) {
      window.clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const stopSources = useCallback(() => {
    audioService.stopTracks(
      playbackTracksRef.current,
    );
    playbackTracksRef.current = [];
  }, []);

  const closeAudioContext = useCallback(
    async (): Promise<void> => {
      const context = contextRef.current;

      contextRef.current = null;

      if (!context || isAudioContextClosed(context)) {
        return;
      }

      try {
        await context.close();
      } catch (caughtError) {
        if (
          !(caughtError instanceof DOMException) ||
          caughtError.name !== 'InvalidStateError'
        ) {
          console.warn(
            '[DubMania] Fermeture du contexte audio impossible :',
            caughtError,
          );
        }
      }
    },
    [],
  );

  const scheduleSourcesAtPosition = useCallback(
    (videoPositionSeconds: number) => {
      const context = contextRef.current;

      if (!context || isAudioContextClosed(context)) {
        return;
      }

      stopSources();

      const contextStart = context.currentTime + 0.045;

      playbackTracksRef.current =
        audioService.scheduleTracks({
          context,
          tracks: loadedTracksRef.current,
          videoPositionSeconds,
          startAtContextTime: contextStart,
          volumes: volumesRef.current,
        });

      contextStartRef.current = contextStart;
      videoStartPositionRef.current =
        videoPositionSeconds;
    },
    [stopSources],
  );

  useEffect(() => {
    let active = true;
    let ownedContext: AudioContext | null = null;

    async function load(): Promise<void> {
      setLoading(true);
      setReady(false);
      setError(null);

      try {
        await closeAudioContext();

        if (!active) {
          return;
        }

        const context = new AudioContext();
        ownedContext = context;
        contextRef.current = context;

        const tracks = await audioService.loadTracks(
          context,
          validatedRecordings,
        );

        if (
          !active ||
          contextRef.current !== context ||
          isAudioContextClosed(context)
        ) {
          if (
            contextRef.current === context
          ) {
            contextRef.current = null;
          }

          if (!isAudioContextClosed(context)) {
            try {
              await context.close();
            } catch {
              // Un autre nettoyage a déjà pu fermer le contexte.
            }
          }

          return;
        }

        loadedTracksRef.current = tracks;

        const initialVolumes = Object.fromEntries(
          tracks.map((track) => [
            track.recording.playerId,
            1,
          ]),
        );

        volumesRef.current = initialVolumes;
        setVolumes(initialVolumes);
        setReady(true);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Les voix ne peuvent pas être chargées.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
      clearSyncInterval();
      stopSources();

      const context = ownedContext;
      ownedContext = null;

      if (contextRef.current === context) {
        contextRef.current = null;
      }

      if (context && !isAudioContextClosed(context)) {
        void context.close().catch(
          (caughtError: unknown) => {
            if (
              !(caughtError instanceof DOMException) ||
              caughtError.name !== 'InvalidStateError'
            ) {
              console.warn(
                '[DubMania] Nettoyage audio impossible :',
                caughtError,
              );
            }
          },
        );
      }
    };
  }, [
    clearSyncInterval,
    closeAudioContext,
    snapshot.round?.id,
    stopSources,
  ]);

  const stop = useCallback(() => {
    clearSyncInterval();
    stopSources();
    contextStartRef.current = null;
    playingRef.current = false;
    setPlaying(false);
  }, [clearSyncInterval, stopSources]);

  const beginDriftMonitoring = useCallback(() => {
    clearSyncInterval();

    syncIntervalRef.current = window.setInterval(() => {
      const context = contextRef.current;
      const contextStart = contextStartRef.current;

      if (
        !context ||
        isAudioContextClosed(context) ||
        contextStart === null ||
        !playingRef.current
      ) {
        return;
      }

      const youtubeState = getYouTubeState();

      if (youtubeState !== 1) {
        return;
      }

      const actualVideoPosition = getYouTubeTime();

      const expectedVideoPosition =
        videoStartPositionRef.current +
        Math.max(
          0,
          context.currentTime - contextStart,
        );

      const driftMs =
        (actualVideoPosition - expectedVideoPosition) *
        1_000;

      const now = performance.now();

      if (
        Math.abs(driftMs) >=
          FINAL_HARD_RESYNC_THRESHOLD_MS &&
        now - lastResyncAtRef.current > 1_000
      ) {
        lastResyncAtRef.current = now;
        scheduleSourcesAtPosition(
          actualVideoPosition,
        );
      }
    }, FINAL_SYNC_POLL_MS);
  }, [
    clearSyncInterval,
    getYouTubeState,
    getYouTubeTime,
    scheduleSourcesAtPosition,
  ]);

  const scheduleAt = useCallback(
    async (serverTime: string) => {
      if (
        !ready ||
        scheduledPlaybackRef.current === serverTime
      ) {
        return;
      }

      const context = contextRef.current;

      if (!context || isAudioContextClosed(context)) {
        setError(
          'Le moteur audio a été fermé. Recharge le résultat pour réessayer.',
        );
        return;
      }

      scheduledPlaybackRef.current = serverTime;

      if (context.state === 'suspended') {
        try {
          await context.resume();
        } catch (caughtError) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Le moteur audio ne peut pas démarrer.',
          );
          return;
        }
      }

      if (
        contextRef.current !== context ||
        isAudioContextClosed(context)
      ) {
        return;
      }

      stop();
      resetYouTube();

      const targetEpoch =
        new Date(serverTime).getTime();

      synchronizationService.schedule(
        targetEpoch,
        () => {
          if (
            contextRef.current !== context ||
            isAudioContextClosed(context)
          ) {
            return;
          }

          const videoTime = getYouTubeTime();

          playYouTube();
          scheduleSourcesAtPosition(videoTime);

          playingRef.current = true;
          setPlaying(true);
          beginDriftMonitoring();
        },
      );
    },
    [
      beginDriftMonitoring,
      getYouTubeTime,
      playYouTube,
      ready,
      resetYouTube,
      scheduleSourcesAtPosition,
      stop,
    ],
  );

  const setPlayerVolume = useCallback(
    (playerId: string, volume: number) => {
      const normalized = Math.max(
        0,
        Math.min(1.5, volume),
      );

      const nextVolumes = {
        ...volumesRef.current,
        [playerId]: normalized,
      };

      volumesRef.current = nextVolumes;
      setVolumes(nextVolumes);

      const activeTrack =
        playbackTracksRef.current.find(
          (track) =>
            track.recording.playerId === playerId,
        );

      const context = contextRef.current;

      if (
        activeTrack &&
        context &&
        !isAudioContextClosed(context)
      ) {
        activeTrack.gain.gain.setTargetAtTime(
          normalized,
          context.currentTime,
          0.015,
        );
      }
    },
    [],
  );

  return {
    loading,
    ready,
    playing,
    error,
    volumes,
    scheduleAt,
    stop,
    setPlayerVolume,
    loadedTracksRef,
  };
}
