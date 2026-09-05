import {
  Crown,
  Mic,
  MicOff,
  UserRound,
  WifiOff,
} from 'lucide-react';
import { PLAYER_COLORS } from '../../config/constants';
import type { LobbyPlayer } from '../../types/lobby';
import type { CSSProperties } from 'react';

interface PlayerCardProps {
  player: LobbyPlayer;
  isCurrentPlayer: boolean;
}

export function PlayerCard({
  player,
  isCurrentPlayer,
}: PlayerCardProps) {
  const microphoneUnavailable =
    player.microphoneState === 'DENIED' ||
    player.microphoneState === 'UNAVAILABLE';

  const microphoneAvailable =
    player.microphoneState === 'AVAILABLE';

  return (
    <li
      className={[
        'player-card',
        isCurrentPlayer
          ? 'player-card--current'
          : '',
        !player.connected
          ? 'player-card--disconnected'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        '--player-color': PLAYER_COLORS[player.slot],
      } as CSSProperties}
    >
      <span
        className="player-card__color"
        aria-hidden="true"
      />

      <div className="player-card__avatar">
        <UserRound size={24} aria-hidden="true" />
        <span className="player-card__slot">
          {player.slot}
        </span>
      </div>

      <div className="player-card__identity">
        <strong>
          {player.nickname}

          {isCurrentPlayer ? (
            <span className="player-card__you">
              Toi
            </span>
          ) : null}
        </strong>

        <span className="player-card__status">
          {player.connected
            ? microphoneAvailable
              ? 'Connecté · micro prêt'
              : microphoneUnavailable
                ? 'Connecté · sans microphone'
                : 'Connecté · micro non testé'
            : 'Déconnecté'}
        </span>
      </div>

      <div className="player-card__badges">
        {player.isHost ? (
          <span className="status-badge status-badge--host">
            <Crown size={16} aria-hidden="true" />
            Host
          </span>
        ) : null}

        <span
          className={[
            'microphone-icon',
            microphoneAvailable
              ? 'microphone-icon--available'
              : '',
            microphoneUnavailable
              ? 'microphone-icon--unavailable'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {!player.connected ? (
            <WifiOff
              size={20}
              aria-label="Joueur déconnecté"
            />
          ) : microphoneUnavailable ? (
            <MicOff
              size={20}
              aria-label="Microphone indisponible"
            />
          ) : (
            <Mic
              size={20}
              aria-label={
                microphoneAvailable
                  ? 'Microphone disponible'
                  : 'Microphone non testé'
              }
            />
          )}
        </span>
      </div>
    </li>
  );
}
