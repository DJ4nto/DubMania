import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { LogOut, Users } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { Loader } from '../components/common/Loader';
import { PlayerCard } from '../components/lobby/PlayerCard';
import { lobbyService } from '../services/LobbyService';
import { getErrorMessage } from '../lib/errors/mapError';
import { useLobbyStore } from '../stores/lobbyStore';
import { useHeartbeat } from '../hooks/useHeartbeat';
import { useRealtimeLobby } from '../hooks/useRealtimeLobby';
import { LobbyCode } from '../components/lobby/LobbyCode';
import { MicrophonePanel } from '../components/lobby/MicrophonePanel';
import { VideoCatalog } from '../components/video/VideoCatalog';
import type { SelectedVideo } from '../types/video';
import { PreparingStage } from '../components/game/PreparingStage';
import { gameStateService } from '../services/GameStateService';
import { FinalPlaybackStage } from '../components/game/FinalPlaybackStage';
import { AppError } from '../lib/errors/AppError';

function normalizeCode(
  value: string | undefined,
): string {
  return (value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

export function LobbyPage() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const normalizedCode = normalizeCode(code);

  const snapshot = useLobbyStore(
    (state) => state.snapshot,
  );
  const setSnapshot = useLobbyStore(
    (state) => state.setSnapshot,
  );

  const [loading, setLoading] = useState(!snapshot);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const loadSnapshot = useCallback(async () => {
    if (normalizedCode.length !== 4) {
      setError('Le code de cette partie est invalide.');
      setLoading(false);
      return;
    }

    try {
      const nextSnapshot =
        await lobbyService.getSnapshot(normalizedCode);

      setSnapshot(nextSnapshot);
      setError(null);
    } catch (caughtError) {
      if (
        caughtError instanceof AppError &&
        (
          caughtError.code === 'LOBBY_NOT_FOUND' ||
          caughtError.code === 'NOT_LOBBY_MEMBER' ||
          caughtError.code === 'SESSION_EXPIRED'
        )
      ) {
        lobbyService.clearSession();
      }

      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [normalizedCode, setSnapshot]);

  useEffect(() => {
    if (
      snapshot?.lobby.code === normalizedCode
    ) {
      setLoading(false);
      return;
    }

    void loadSnapshot();
  }, [loadSnapshot, normalizedCode, snapshot?.lobby.code]);

  const currentPlayerId =
    snapshot?.currentPlayerId ?? null;

  useHeartbeat(currentPlayerId);
  useRealtimeLobby({
    lobbyId: snapshot?.lobby.id ?? null,
    onChange: loadSnapshot,
  });


  const currentPlayer = useMemo(
    () =>
      snapshot?.players.find(
        (player) =>
          player.id === snapshot.currentPlayerId,
      ) ?? null,
    [snapshot],
  );

  async function handleLeave() {
    if (!currentPlayerId || leaving) return;

    setLeaving(true);

    try {
      await lobbyService.leave(currentPlayerId);
      setSnapshot(null);
      navigate('/', { replace: true });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setLeaving(false);
    }
  }

  async function handleSelectVideo(
    video: SelectedVideo,
  ): Promise<void> {
    const lobbyId = snapshot?.lobby.id;

    if (!lobbyId) {
      setError(
        'Le lobby n’est plus disponible. Recharge la page.',
      );
      return;
    }

    try {
      const nextSnapshot =
        await lobbyService.selectVideo(
          lobbyId,
          video,
        );

      setSnapshot(nextSnapshot);
      setError(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function handlePrepareRound(): Promise<void> {
    const lobbyId = snapshot?.lobby.id;

    if (!lobbyId) return;

    try {
      const nextSnapshot =
        await gameStateService.prepareRound(lobbyId);

      setSnapshot(nextSnapshot);
      setError(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }


  if (loading) {
    return <Loader label="Chargement du lobby…" />;
  }

  if (error || !snapshot) {
    return (
      <AppShell title="Lobby inaccessible">
        <section className="empty-state panel">
          <p role="alert">
            {error ??
              'Cette partie ne peut pas être affichée.'}
          </p>

          <button
            className="button button--secondary"
            type="button"
            onClick={() => void loadSnapshot()}
          >
            Réessayer
          </button>

          <Link
            className="button button--ghost"
            to="/"
          >
            Retour à l’accueil
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Lobby"
      description={
        currentPlayer?.isHost
          ? 'Tu es le host de cette partie.'
          : 'En attente du lancement par le host.'
      }
    >
      <div className="lobby-layout">
        <section className="lobby-main panel">
          <LobbyCode code={snapshot.lobby.code} />
            <div
                className={[
                    'lobby-status-banner',
                    currentPlayer?.isHost
                    ? 'lobby-status-banner--host'
                    : 'lobby-status-banner--guest',
                ].join(' ')}
                >
                <div className="lobby-status-banner__icon">
                    {currentPlayer?.isHost ? '★' : '●'}
                </div>

                <div>
                    <strong>
                    {currentPlayer?.isHost
                        ? 'Tu diriges la partie'
                        : `${snapshot.players.find(
                            (player) => player.isHost,
                        )?.nickname ?? 'Le host'} dirige la partie`}
                    </strong>

                    <span>
                    {currentPlayer?.isHost
                        ? 'Choisis la prochaine vidéo lorsque tout le monde est prêt.'
                        : 'Reste dans le lobby pendant que le host prépare la manche.'}
                    </span>
                </div>
                </div>
          <div className="section-heading">
            <h2>
              <Users size={25} aria-hidden="true" />
              Joueurs
            </h2>

            <span>
              {snapshot.players.length}/4
            </span>
          </div>

          <ul className="player-list">
            {snapshot.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isCurrentPlayer={
                  player.id === snapshot.currentPlayerId
                }
              />
            ))}
          </ul>

          {currentPlayer ? (
            <MicrophonePanel
              playerId={currentPlayer.id}
              initialState={currentPlayer.microphoneState}
            />
          ) : null}

          {snapshot.lobby.state === 'VIDEO_SELECTION' ? (
            <>
              {currentPlayer?.isHost ? (
                <>
                  <VideoCatalog
                    selectedVideo={snapshot.lobby.selectedVideo}
                    playedVideoIds={snapshot.playedVideoIds}
                    onSelect={handleSelectVideo}
                  />
                  <button
                    className="button button--primary button--full"
                    type="button"
                    onClick={() => void handlePrepareRound()}
                    disabled={!snapshot.lobby.selectedVideo}
                  >
                    Commencer
                  </button>
                </>
              ) : snapshot.lobby.selectedVideo ? (
                <section className="selected-video-summary">
                  <img
                    src={snapshot.lobby.selectedVideo.thumbnail}
                    alt=""
                  />
                  <div>
                    <span className="eyebrow">
                      Vidéo choisie
                    </span>
                    <strong>
                      {snapshot.lobby.selectedVideo.title}
                    </strong>
                    <p>
                      Le host prépare la prochaine manche.
                    </p>
                  </div>
                </section>
              ) : (
                <p className="waiting-message" role="status">
                  Le host choisira bientôt une vidéo.
                </p>
              )}
            </>
          ) : snapshot.lobby.state === 'PREPARING' ||
              snapshot.lobby.state === 'COUNTDOWN' ||
              snapshot.lobby.state === 'RECORDING' ||
              snapshot.lobby.state === 'REVIEW' ? (
            <PreparingStage
              snapshot={snapshot}
              onSnapshot={setSnapshot}
              onError={setError}
            />
          ) : snapshot.lobby.state === 'FINAL_READY' ||
              snapshot.lobby.state === 'FINAL_PLAYBACK' ? (
            <FinalPlaybackStage
              snapshot={snapshot}
              onSnapshot={setSnapshot}
              onError={setError}
            />
          ) : (
            <p className="waiting-message">
              Chargement de l’étape…
            </p>
          )}

          <button
            className="button button--danger button--full"
            type="button"
            onClick={handleLeave}
            disabled={leaving}
          >
            <LogOut size={20} aria-hidden="true" />
            {leaving ? 'Départ…' : 'Quitter la partie'}
          </button>
        </section>
      </div>
    </AppShell>
  );
}
