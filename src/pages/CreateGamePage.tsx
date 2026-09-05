import {
  useState,
  type FormEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { lobbyService } from '../services/LobbyService';
import { getErrorMessage } from '../lib/errors/mapError';
import { useLobbyStore } from '../stores/lobbyStore';

const NICKNAME_MAX_LENGTH = 24;

export function CreateGamePage() {
  const navigate = useNavigate();
  const setSnapshot = useLobbyStore(
    (state) => state.setSnapshot,
  );

  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedNickname = nickname
      .trim()
      .replace(/\s+/g, ' ');

    if (!normalizedNickname) {
      setMessage(
        'Entre ton pseudo avant de créer la partie.',
      );
      return;
    }

    if (
      normalizedNickname.length > NICKNAME_MAX_LENGTH
    ) {
      setMessage(
        `Ton pseudo ne peut pas dépasser ${NICKNAME_MAX_LENGTH} caractères.`,
      );
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const snapshot = await lobbyService.create(
        normalizedNickname,
      );

      setSnapshot(snapshot);
      navigate(`/lobby/${snapshot.lobby.code}`, {
        replace: true,
      });
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Créer une partie"
      description="Choisis ton pseudo. Tu deviendras le host du lobby."
    >
      <section className="form-card">
        <form className="game-form" onSubmit={handleSubmit}>
          <div className="field">
            <label
              className="field__label"
              htmlFor="nickname"
            >
              Ton pseudo
            </label>

            <input
              id="nickname"
              className="field__input"
              name="nickname"
              type="text"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setMessage(null);
              }}
              placeholder="Ex. Alice"
              minLength={1}
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="nickname"
              autoFocus
              required
              disabled={submitting}
            />

            <span className="field__hint">
              {nickname.length}/{NICKNAME_MAX_LENGTH}
            </span>
          </div>

          {message ? (
            <p className="form-message" role="alert">
              {message}
            </p>
          ) : null}

          <button
            className="button button--primary button--full"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'Création…'
              : 'Créer la partie'}
          </button>

          <Link
            className="button button--ghost button--full"
            to="/"
            aria-disabled={submitting}
          >
            Retour
          </Link>
        </form>
      </section>
    </AppShell>
  );
}
