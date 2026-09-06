import { Link } from 'react-router-dom';
import { LogIn, X } from 'lucide-react';
import type { StoredLobbySession } from '../../types/lobby';

interface ResumeLobbyCardProps {
  session: StoredLobbySession;
  onForget: () => void;
}

export function ResumeLobbyCard({
  session,
  onForget,
}: ResumeLobbyCardProps) {
  return (
    <section className="resume-lobby-card">
      <div>
        <span className="eyebrow">
          Partie retrouvée
        </span>

        <strong>
          Lobby {session.lobbyCode}
        </strong>

        <p>
          Tu peux essayer de reprendre ta place dans la
          partie.
        </p>
      </div>

      <div className="resume-lobby-card__actions">
        <Link
          className="button button--secondary button--compact"
          to={`/lobby/${session.lobbyCode}`}
        >
          <LogIn size={18} aria-hidden="true" />
          Reprendre
        </Link>

        <button
          className="button button--ghost button--compact"
          type="button"
          onClick={onForget}
        >
          <X size={18} aria-hidden="true" />
          Oublier
        </button>
      </div>
    </section>
  );
}
