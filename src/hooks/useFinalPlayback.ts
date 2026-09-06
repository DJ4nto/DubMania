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
import type { LobbySnapshot } from '../types/lobby';

interface UseFinalPlaybackOptions {
  snapshot: LobbySnapshot;
  playYouTube: () => void;
  resetYouTube: () => void;
  getYouTubeTime: () => number;
}

export function useFinalPlayback({
  snapshot,
  playYouTube,
  resetYouTube,
  getYouTubeTime,
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
  const scheduledPlaybackRef = useRef<string | null>(
    null,
  );

  const validatedRecordings =
    snapshot.recordings.filter(
      (recording) => recording.status === 'VALIDATED',
    );

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const context = new AudioContext();
        contextRef.current = context;

        const tracks = await audioService.loadTracks(
          context,
          validatedRecordings,
        );

        if (!active) {
          await context.close();
          return;
        }

        loadedTracksRef.current = tracks;

        setVolumes(
          Object.fromEntries(
            tracks.map((track) => [
              track.recording.playerId,
              1,
            ]),
          ),
        );

        setReady(true);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Les voix ne peuvent pas être chargées.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
      audioService.stopTracks(
        playbackTracksRef.current,
      );
      playbackTracksRef.current = [];
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, [snapshot.round?.id]);

  const stop = useCallback(() => {
    audioService.stopTracks(
      playbackTracksRef.current,
    );
    playbackTracksRef.current = [];
    setPlaying(false);
  }, []);

  const scheduleAt = useCallback(
    async (serverTime: string) => {
      if (
        !ready ||
        scheduledPlaybackRef.current === serverTime
      ) {
        return;
      }

      scheduledPlaybackRef.current = serverTime;

      const context = contextRef.current;

      if (!context) return;

      if (context.state === 'suspended') {
        await context.resume();
      }

      stop();
      resetYouTube();

      const targetEpoch =
        new Date(serverTime).getTime();

      synchronizationService.schedule(
        targetEpoch,
        () => {
          const videoTime = getYouTubeTime();
          const contextStart =
            context.currentTime + 0.06;

          playYouTube();

          playbackTracksRef.current =
            audioService.scheduleTracks({
              context,
              tracks: loadedTracksRef.current,
              videoPositionSeconds: videoTime,
              startAtContextTime: contextStart,
              volumes,
            });

          setPlaying(true);
        },
      );
    },
    [
      getYouTubeTime,
      playYouTube,
      ready,
      resetYouTube,
      stop,
      volumes,
    ],
  );

  const setPlayerVolume = useCallback(
    (playerId: string, volume: number) => {
      const normalized = Math.max(
        0,
        Math.min(1.5, volume),
      );

      setVolumes((current) => ({
        ...current,
        [playerId]: normalized,
      }));

      const activeTrack =
        playbackTracksRef.current.find(
          (track) =>
            track.recording.playerId === playerId,
        );

      if (activeTrack && contextRef.current) {
        activeTrack.gain.gain.setTargetAtTime(
          normalized,
          contextRef.current.currentTime,
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
