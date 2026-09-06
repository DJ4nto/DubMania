import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Download, Play, RotateCcw } from 'lucide-react';
import { YouTubePlayer } from '../video/YouTubePlayer';
import { VolumeStrip } from '../audio/VolumeStrip';
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';
import { useFinalPlayback } from '../../hooks/useFinalPlayback';
import { gameStateService } from '../../services/GameStateService';
import { synchronizationService } from '../../services/SynchronizationService';
import { getErrorMessage } from '../../lib/errors/mapError';
import { PLAYER_COLORS } from '../../config/constants';
import type { LobbySnapshot } from '../../types/lobby';

interface FinalPlaybackStageProps {
  snapshot: LobbySnapshot;
  onSnapshot: (snapshot: LobbySnapshot) => void;
  onError: (message: string) => void;
}

export function FinalPlaybackStage({
  snapshot,
  onSnapshot,
  onError,
}: FinalPlaybackStageProps) {
  const [submitting, setSubmitting] = useState(false);

  const round = snapshot.round;
  const currentPlayer = snapshot.players.find(
    (player) =>
      player.id === snapshot.currentPlayerId,
  );

  const youtube = useYouTubePlayer({
    youtubeId: round?.video.youtubeId ?? '',
  });

  const getYouTubeTime = useCallback(
    () =>
      youtube.playerRef.current?.getCurrentTime() ??
      0,
    [youtube.playerRef],
  );

  const finalPlayback = useFinalPlayback({
    snapshot,
    playYouTube: youtube.play,
    resetYouTube: youtube.prepareReplay,
    getYouTubeTime,
  });

  const scheduleFinalAt = finalPlayback.scheduleAt;

  useEffect(() => {
    if (
      snapshot.lobby.state === 'FINAL_PLAYBACK' &&
      round?.finalPlaybackAt
    ) {
      void scheduleFinalAt(round.finalPlaybackAt);
    }
  }, [
    round?.finalPlaybackAt,
    scheduleFinalAt,
    snapshot.lobby.state,
  ]);

  const validatedByPlayer = useMemo(
    () =>
      new Map(
        snapshot.recordings
          .filter(
            (recording) =>
              recording.status === 'VALIDATED',
          )
          .map((recording) => [
            recording.playerId,
            recording,
          ]),
      ),
    [snapshot.recordings],
  );

  async function handlePlay(): Promise<void> {
    if (!currentPlayer?.isHost) return;

    setSubmitting(true);

    try {
      await synchronizationService.synchronize(5);

      const nextSnapshot =
        await gameStateService.scheduleFinalPlayback(
          snapshot.lobby.id,
        );

      onSnapshot(nextSnapshot);
    } catch (caughtError) {
      onError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNextVideo(): Promise<void> {
    if (!currentPlayer?.isHost) return;

    setSubmitting(true);

    try {
      finalPlayback.stop();

      const nextSnapshot =
        await gameStateService.returnToVideoSelection(
          snapshot.lobby.id,
        );

      onSnapshot(nextSnapshot);
    } catch (caughtError) {
      onError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!round || !currentPlayer) {
    return (
      <p className="form-message" role="alert">
        Le doublage final ne peut pas être chargé.
      </p>
    );
  }

  return (
    <section className="final-playback-stage">
      <div className="game-stage-heading">
        <span className="eyebrow">
          Le doublage
        </span>

        <h2>{round.video.title}</h2>

        <p>
          La vidéo originale et toutes les voix validées
          seront lues simultanément.
        </p>
      </div>

      <YouTubePlayer
        containerRef={youtube.containerRef}
        status={youtube.status}
        error={youtube.error}
      />

      {finalPlayback.loading ? (
        <p className="waiting-message">
          Chargement des voix…
        </p>
      ) : null}

      {finalPlayback.error ? (
        <p className="microphone-error" role="alert">
          {finalPlayback.error}
        </p>
      ) : null}

      <div className="final-volume-list">
        {snapshot.players.map((player) => {
          const recording =
            validatedByPlayer.get(player.id);

          return (
            <div key={player.id}>
              {recording ? (
                <VolumeStrip
                  nickname={player.nickname}
                  color={PLAYER_COLORS[player.slot]}
                  value={
                    finalPlayback.volumes[player.id] ?? 1
                  }
                  onChange={(volume) =>
                    finalPlayback.setPlayerVolume(
                      player.id,
                      volume,
                    )
                  }
                />
              ) : (
                <div className="missing-voice">
                  <span
                    style={{
                      background:
                        PLAYER_COLORS[player.slot],
                    }}
                  />
                  <strong>{player.nickname}</strong>
                  <em>Aucune piste audio</em>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {currentPlayer.isHost ? (
        <div className="final-playback-actions">
          <button
            className="button button--primary button--full"
            type="button"
            onClick={() => void handlePlay()}
            disabled={
              submitting ||
              !youtube.isReady ||
              !finalPlayback.ready
            }
          >
            {snapshot.lobby.state === 'FINAL_PLAYBACK' ? (
              <>
                <RotateCcw size={20} aria-hidden="true" />
                Rejouer
              </>
            ) : (
              <>
                <Play size={20} aria-hidden="true" />
                Jouer le doublage
              </>
            )}
          </button>

          <button
            className="button button--secondary button--full"
            type="button"
            onClick={() => void handleNextVideo()}
            disabled={submitting}
          >
            Choisir une autre vidéo
          </button>
        </div>
      ) : (
        <p className="waiting-message">
          Le host lancera le doublage final.
        </p>
      )}

      <button
        className="button button--ghost button--full"
        type="button"
        disabled
        title="L’export WAV sera activé après le test du mix final."
      >
        <Download size={20} aria-hidden="true" />
        Télécharger le mix des voix
      </button>
    </section>
  );
}
