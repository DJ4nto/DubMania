import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, Circle, Play } from 'lucide-react';
import { YouTubePlayer } from '../video/YouTubePlayer';
import { Countdown } from './Countdown';
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';
import { useSynchronizedCountdown } from '../../hooks/useSynchronizedCountdown';
import { synchronizationService } from '../../services/SynchronizationService';
import { gameStateService } from '../../services/GameStateService';
import { getErrorMessage } from '../../lib/errors/mapError';
import type { LobbySnapshot } from '../../types/lobby';
import { useRoundRecording } from '../../hooks/useRoundRecording';
import { formatDuration } from '../../lib/format';
import { microphoneSessionService } from '../../services/MicrophoneSessionService';

interface PreparingStageProps {
  snapshot: LobbySnapshot;
  onSnapshot: (snapshot: LobbySnapshot) => void;
  onError: (message: string) => void;
}

export function PreparingStage({
  snapshot,
  onSnapshot,
  onError,
}: PreparingStageProps) {
  const [submitting, setSubmitting] = useState(false);
  const [clockReady, setClockReady] = useState(false);
  const startTriggeredRef = useRef(false);

  const round = snapshot.round;
  const currentPlayer = snapshot.players.find(
    (player) =>
      player.id === snapshot.currentPlayerId,
  );

  const host = snapshot.players.find(
    (player) => player.isHost,
  );

  const scheduledStartAt =
    round?.scheduledStartAt ?? null;

  const countdown =
    useSynchronizedCountdown(scheduledStartAt);

  const recording = useRoundRecording({
    snapshot,
    onSnapshot,
  });

  const handlePlaying = useCallback(
    (
        currentTimeSeconds: number,
        performanceTimeMs: number,
    ) => {
        void recording.startAtYouTubePosition(
        currentTimeSeconds,
        performanceTimeMs,
        );
    },
    [recording],
  );

    const youtube = useYouTubePlayer({
    youtubeId: round?.video.youtubeId ?? '',
    onPlaying: handlePlaying,
    onEnded: (endSeconds) => {
        void recording.finish(endSeconds);
    },
    });

  useEffect(() => {
    if (!round) return;

    let active = true;

    synchronizationService
      .synchronize()
      .then(() => {
        if (active) setClockReady(true);
      })
      .catch(() => {
        if (active) {
          onError(
            'Impossible de synchroniser l’horloge de la partie.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [onError, round]);

  useEffect(() => {
    if (
      !scheduledStartAt ||
      !clockReady ||
      startTriggeredRef.current
    ) {
      return;
    }

    const startEpoch =
      new Date(scheduledStartAt).getTime();

    return synchronizationService.schedule(
      startEpoch,
      () => {
        if (startTriggeredRef.current) return;

        startTriggeredRef.current = true;
        youtube.play();

        if (round) {
          window.setTimeout(() => {
            gameStateService
              .confirmStarted(
                snapshot.lobby.id,
                round.id,
              )
              .then(onSnapshot)
              .catch((error) => {
                console.warn(
                  '[DubMania] Confirmation de départ :',
                  error,
                );
              });
          }, 550);
        }
      },
    );
  }, [
    clockReady,
    onSnapshot,
    round,
    scheduledStartAt,
    snapshot.lobby.id,
    youtube,
  ]);

  const blockingPlayers = useMemo(
    () =>
      snapshot.players.filter(
        (player) =>
          player.connected &&
          player.microphoneState !== 'DENIED' &&
          player.microphoneState !== 'UNAVAILABLE' &&
          player.roundStatus !== 'READY',
      ),
    [snapshot.players],
  );

  const canSchedule =
    currentPlayer?.isHost &&
    blockingPlayers.length === 0 &&
    youtube.isReady &&
    clockReady &&
    snapshot.lobby.state === 'PREPARING';

  async function handleReady(): Promise<void> {
    if (!round || !currentPlayer) return;

    setSubmitting(true);

    try {
      const AudioContextConstructor =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (AudioContextConstructor) {
        const audioContext =
        new AudioContextConstructor();

        try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        } finally {
        if (audioContext.state !== 'closed') {
            try {
            await audioContext.close();
            } catch (caughtError) {
            if (
                !(caughtError instanceof DOMException) ||
                caughtError.name !== 'InvalidStateError'
            ) {
                console.warn(
                '[DubMania] Fermeture du contexte de préparation impossible :',
                caughtError,
                );
            }
            }
        }
        }
      }

      const nextSnapshot =
        await gameStateService.markReady(
          currentPlayer.id,
          round.id,
        );

      onSnapshot(nextSnapshot);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchedule(): Promise<void> {
    setSubmitting(true);

    try {
      const nextSnapshot =
        await gameStateService.scheduleStart(
          snapshot.lobby.id,
        );

      onSnapshot(nextSnapshot);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(): Promise<void> {
    setSubmitting(true);

    try {
      const nextSnapshot =
        await gameStateService.cancelPreparation(
          snapshot.lobby.id,
        );

      youtube.reset();
      onSnapshot(nextSnapshot);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!round || !currentPlayer) {
    return (
      <p className="form-message" role="alert">
        La manche ne peut pas être chargée.
      </p>
    );
  }

  return (
    <section className="preparing-stage">
      <Countdown value={countdown} />

      <div className="game-stage-heading">
        <span className="eyebrow">
          Manche {round.sequenceNumber}
        </span>

        <h2>{round.video.title}</h2>

        <p>
          Prépare ton microphone et attends le départ
          synchronisé.
        </p>
      </div>

      <YouTubePlayer
        containerRef={youtube.containerRef}
        status={youtube.status}
        error={youtube.error}
      />

{recording.phase === 'RECORDING' ? (
  <section
    className="active-recording"
    aria-live="polite"
  >
    <div className="recording-indicator">
      <span
        className="recording-indicator__dot"
        aria-hidden="true"
      />

      <div>
        <strong>Enregistrement</strong>
        <span>
          Tu es en train de doubler !
        </span>
      </div>

      <time>
        {formatDuration(
          Math.floor(
            recording.elapsedMs / 1_000,
          ),
        )}

        {round.video.duration !== null ? (
          <>
            {' / '}
            {formatDuration(
              round.video.duration,
            )}
          </>
        ) : null}
      </time>
    </div>

            <div className="active-recording__actions">
            <button
                className="button button--danger button--full"
                type="button"
                onClick={() => {
                const player = youtube.playerRef.current;

                const currentYouTubeSeconds =
                    player?.getCurrentTime() ??
                    recording.elapsedMs / 1_000;

                player?.pauseVideo();

                void recording.finishManually(
                    currentYouTubeSeconds,
                );
                }}
            >
                Terminer mon doublage
            </button>

            <p className="active-recording__hint">
                L’enregistrement s’arrêtera aussi
                automatiquement à la fin de la vidéo.
            </p>
            </div>
        </section>
        ) : null}


        {recording.phase === 'ACQUIRING_MIC' ? (
        <p className="waiting-message" role="status">
            Ouverture du microphone…
        </p>
        ) : null}

        {recording.phase === 'PROCESSING' ||
        recording.phase === 'UPLOADING' ? (
        <p className="waiting-message" role="status">
            {recording.phase === 'PROCESSING'
            ? 'Préparation de ton doublage…'
            : 'Envoi sécurisé de ton doublage…'}
        </p>
        ) : null}

        {recording.phase === 'REVIEW' &&
        recording.recordingUrl ? (
        <section className="recording-review">
            <div>
            <span className="eyebrow">
                Ton doublage est prêt
            </span>
            <h3>Écoute avant de valider</h3>
            </div>

            <audio
            className="recording-review__audio"
            src={recording.recordingUrl}
            controls
            preload="metadata"
            />

            <div className="recording-review__actions">
            <button
                className="button button--success button--full"
                type="button"
                onClick={() => void recording.validate()}
            >
                Valider mon doublage
            </button>

            {recording.attempt === 1 ? (
                <button
                className="button button--secondary button--full"
                type="button"
                onClick={async () => {
                try {
                    await microphoneSessionService.prepare();
                    await recording.retry();
                    youtube.prepareReplay();

                    window.setTimeout(() => {
                    youtube.play();
                    }, 1_500);
                } catch (caughtError) {
                    onError(getErrorMessage(caughtError));
                }
                }}
                >
                Refaire une fois
                </button>
            ) : null}
            </div>

            {recording.attempt === 2 ? (
            <p className="recording-review__final-attempt">
                Deuxième essai : la prochaine validation sera
                définitive.
            </p>
            ) : null}

        </section>
        ) : null}

        {recording.phase === 'VALIDATED' ? (
        <p className="validation-message" role="status">
            Ton doublage est validé. En attente des autres
            joueurs…
        </p>
        ) : null}

        {recording.error ? (
        <p className="microphone-error" role="alert">
            {recording.error}
        </p>
        ) : null}


      <div className="ready-list">
        {snapshot.players.map((player) => {
          const resolved =
            player.roundStatus === 'READY' ||
            player.roundStatus === 'NO_MIC' ||
            player.roundStatus === 'DISCONNECTED';

          return (
            <div
              className="ready-player"
              key={player.id}
            >
              {resolved ? (
                <CheckCircle2
                  size={21}
                  aria-hidden="true"
                />
              ) : (
                <Circle
                  size={21}
                  aria-hidden="true"
                />
              )}

              <span>{player.nickname}</span>

              <strong>
                {player.roundStatus === 'NO_MIC'
                  ? 'Sans micro'
                  : resolved
                    ? 'Prêt'
                    : 'Préparation'}
              </strong>
            </div>
          );
        })}
      </div>

      {currentPlayer.roundStatus !== 'READY' &&
      currentPlayer.roundStatus !== 'NO_MIC' ? (
        <button
          className="button button--secondary button--full"
          type="button"
          onClick={() => void handleReady()}
          disabled={
            submitting ||
            !youtube.isReady ||
            !clockReady
          }
        >
          Je suis prêt
        </button>
      ) : null}

      {currentPlayer.isHost ? (
        <>
          <button
            className="button button--primary button--full"
            type="button"
            onClick={() => void handleSchedule()}
            disabled={!canSchedule || submitting}
          >
            <Play size={20} aria-hidden="true" />
            Lancer le compte à rebours
          </button>

          <button
            className="button button--ghost button--full"
            type="button"
            onClick={() => void handleCancel()}
            disabled={submitting}
          >
            Annuler la préparation
          </button>
        </>
      ) : (
        <p className="waiting-message" role="status">
          {host?.nickname ?? 'Le host'} lancera la
          manche lorsque tout le monde sera prêt.
        </p>
      )}
    </section>
  );
}
