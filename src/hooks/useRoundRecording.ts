import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  recordingService,
  type RecordingResult,
} from '../services/RecordingService';
import { microphoneSessionService } from '../services/MicrophoneSessionService';
import { getErrorMessage } from '../lib/errors/mapError';
import {
  MAX_MANUAL_RECORDING_DURATION_MS,
  RECORDING_DURATION_GRACE_MS,
} from '../config/constants';
import type { LobbySnapshot } from '../types/lobby';

export type RoundRecordingPhase =
  | 'IDLE'
  | 'ACQUIRING_MIC'
  | 'RECORDING'
  | 'PROCESSING'
  | 'UPLOADING'
  | 'REVIEW'
  | 'VALIDATED'
  | 'SKIPPED'
  | 'ERROR';

export type RecordingStopReason =
  | 'YOUTUBE_ENDED'
  | 'CATALOG_DURATION'
  | 'MANUAL'
  | 'SAFETY_TIMEOUT';

interface UseRoundRecordingOptions {
  snapshot: LobbySnapshot;
  onSnapshot: (snapshot: LobbySnapshot) => void;
}

export function useRoundRecording({
  snapshot,
  onSnapshot,
}: UseRoundRecordingOptions) {
  const [phase, setPhase] =
    useState<RoundRecordingPhase>('IDLE');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordingUrl, setRecordingUrl] =
    useState<string | null>(null);
  const [recordingId, setRecordingId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    null,
  );
  const [stopReason, setStopReason] =
    useState<RecordingStopReason | null>(null);

  const startedRef = useRef(false);
  const stoppingRef = useRef(false);
  const startOffsetRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const automaticStopTimerRef =
    useRef<number | null>(null);
  const safetyStopTimerRef =
    useRef<number | null>(null);
  const resultRef = useRef<RecordingResult | null>(
    null,
  );
  const recordingUrlRef = useRef<string | null>(null);

  const round = snapshot.round;

  const currentPlayer = snapshot.players.find(
    (player) =>
      player.id === snapshot.currentPlayerId,
  );

  const stopElapsedTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAutomaticTimers = useCallback(() => {
    if (automaticStopTimerRef.current !== null) {
      window.clearTimeout(
        automaticStopTimerRef.current,
      );
      automaticStopTimerRef.current = null;
    }

    if (safetyStopTimerRef.current !== null) {
      window.clearTimeout(
        safetyStopTimerRef.current,
      );
      safetyStopTimerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    stopElapsedTimer();
    stopAutomaticTimers();
  }, [stopAutomaticTimers, stopElapsedTimer]);

  const skip = useCallback(async () => {
    if (!round || !currentPlayer) {
      return;
    }

    try {
      const nextSnapshot =
        await recordingService.skip(
          currentPlayer.id,
          round.id,
        );

      setPhase('SKIPPED');
      onSnapshot(nextSnapshot);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setPhase('ERROR');
    }
  }, [currentPlayer, onSnapshot, round]);

  const finish = useCallback(
    async (
      youtubeEndSeconds: number,
      reason: RecordingStopReason = 'MANUAL',
    ) => {
      if (
        stoppingRef.current ||
        !recordingService.isRecording ||
        !round ||
        !currentPlayer
      ) {
        return;
      }

      stoppingRef.current = true;
      clearTimers();
      setStopReason(reason);
      setPhase('PROCESSING');

      try {
        const result = await recordingService.stop();

        resultRef.current = result;

        if (recordingUrlRef.current) {
          URL.revokeObjectURL(
            recordingUrlRef.current,
          );
        }

        const nextUrl = URL.createObjectURL(
          result.blob,
        );

        recordingUrlRef.current = nextUrl;
        setRecordingUrl(nextUrl);
        setPhase('UPLOADING');

        const fallbackEndOffsetMs =
          startOffsetRef.current +
          result.durationMs;

        const reportedEndOffsetMs =
          youtubeEndSeconds > 0
            ? youtubeEndSeconds * 1_000
            : fallbackEndOffsetMs;

        const registered =
          await recordingService.uploadAndRegister({
            lobbyId: snapshot.lobby.id,
            roundId: round.id,
            playerId: currentPlayer.id,
            attempt: 1,
            recording: result,
            startOffsetMs:
              startOffsetRef.current,
            endOffsetMs: Math.max(
              startOffsetRef.current,
              reportedEndOffsetMs,
            ),
          });

        setRecordingId(registered.recordingId);
        setPhase('REVIEW');
        onSnapshot(registered.snapshot);
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
        setPhase('ERROR');
      } finally {
        microphoneSessionService.release();
      }
    },
    [
      clearTimers,
      currentPlayer,
      onSnapshot,
      round,
      snapshot.lobby.id,
    ],
  );

  const startAtYouTubePosition = useCallback(
    async (
      youtubeSeconds: number,
      detectedAtPerformanceMs: number,
    ) => {
      if (
        startedRef.current ||
        !round ||
        !currentPlayer
      ) {
        return;
      }

      startedRef.current = true;
      stoppingRef.current = false;
      setError(null);
      setStopReason(null);

      if (
        currentPlayer.microphoneState === 'DENIED' ||
        currentPlayer.microphoneState === 'UNAVAILABLE'
      ) {
        await skip();
        return;
      }

      try {
        setPhase('ACQUIRING_MIC');

        const stream =
          await microphoneSessionService.acquire();

        await recordingService.start(stream);

        const recorderStartedAt = performance.now();

        const delayAfterDetection = Math.max(
          0,
          recorderStartedAt -
            detectedAtPerformanceMs,
        );

        const startOffsetMs =
          youtubeSeconds * 1_000 +
          delayAfterDetection;

        startOffsetRef.current = startOffsetMs;

        setPhase('RECORDING');
        setElapsedMs(0);

        const timerStartedAt = performance.now();

        timerRef.current = window.setInterval(() => {
          setElapsedMs(
            performance.now() - timerStartedAt,
          );
        }, 200);

        const configuredDurationSeconds =
          round.video.duration;

        if (
          configuredDurationSeconds !== null &&
          configuredDurationSeconds > 0
        ) {
          /*
           * Si MediaRecorder a démarré alors que YouTube avait
           * déjà avancé, on ne réenregistre pas la durée totale.
           *
           * Exemple :
           * durée catalogue = 180 s
           * début réel de l'enregistrement = 0,4 s
           * délai restant = 179,6 s + marge
           */
          const remainingVideoMs = Math.max(
            0,
            configuredDurationSeconds * 1_000 -
              startOffsetMs,
          );

          automaticStopTimerRef.current =
            window.setTimeout(() => {
              void finish(
                configuredDurationSeconds,
                'CATALOG_DURATION',
              );
            }, remainingVideoMs + RECORDING_DURATION_GRACE_MS);
        } else {
          /*
           * Une URL YouTube manuelle ne possède pas encore de
           * durée configurée. Cette limite empêche un micro de
           * rester actif indéfiniment si YouTube n'envoie pas ENDED.
           */
          safetyStopTimerRef.current =
            window.setTimeout(() => {
              const estimatedEndSeconds =
                (startOffsetRef.current +
                  MAX_MANUAL_RECORDING_DURATION_MS) /
                1_000;

              void finish(
                estimatedEndSeconds,
                'SAFETY_TIMEOUT',
              );
            }, MAX_MANUAL_RECORDING_DURATION_MS);
        }
      } catch (caughtError) {
        clearTimers();
        setError(getErrorMessage(caughtError));
        setPhase('ERROR');
        await skip();
      }
    },
    [
      clearTimers,
      currentPlayer,
      finish,
      round,
      skip,
    ],
  );

  const finishManually = useCallback(
    async (currentYouTubeSeconds: number) => {
      await finish(
        currentYouTubeSeconds,
        'MANUAL',
      );
    },
    [finish],
  );

  const finishFromYouTubeEnd = useCallback(
    async (youtubeEndSeconds: number) => {
      await finish(
        youtubeEndSeconds,
        'YOUTUBE_ENDED',
      );
    },
    [finish],
  );

  const validate = useCallback(async () => {
    if (!recordingId) {
      return;
    }

    try {
      const nextSnapshot =
        await recordingService.validate(recordingId);

      setPhase('VALIDATED');
      onSnapshot(nextSnapshot);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setPhase('ERROR');
    }
  }, [onSnapshot, recordingId]);

  useEffect(() => {
    return () => {
      clearTimers();

      if (recordingService.isRecording) {
        recordingService.abort();
      }

      microphoneSessionService.release();

      if (recordingUrlRef.current) {
        URL.revokeObjectURL(
          recordingUrlRef.current,
        );
        recordingUrlRef.current = null;
      }
    };
  }, [clearTimers]);

  return {
    phase,
    elapsedMs,
    recordingUrl,
    stopReason,
    error,
    startAtYouTubePosition,
    finish: finishFromYouTubeEnd,
    finishManually,
    validate,
    skip,
  };
}
