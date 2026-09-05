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
const LOBBY_CODE_LENGTH = 4;

function normalizeLobbyCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LOBBY_CODE_LENGTH);
}

export function JoinGamePage() {
  const navigate = useNavigate();
  const setSnapshot = useLobbyStore(
    (state) => state.setSnapshot,
  );

  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
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
    const normalizedCode = normalizeLobbyCode(code);

    if (!normalizedNickname) {
      setMessage(
        'Entre ton pseudo pour rejoindre la partie.',
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

    if (
      normalizedCode.length !== LOBBY_CODE_LENGTH
    ) {
      setMessage(
        `Le code doit contenir ${LOBBY_CODE_LENGTH} caractères.`,
      );
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const snapshot = await lobbyService.join(
        normalizedCode,
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
      title="Rejoindre une partie"
      description="Entre ton pseudo et le code transmis par le host."
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
              placeholder="Ex. Bob"
              minLength={1}
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="nickname"
              autoFocus
              required
              disabled={submitting}
            />
          </div>

          <div className="field">
            <label
              className="field__label"
              htmlFor="lobby-code"
            >
              Code de la partie
            </label>

            <input
              id="lobby-code"
              className="field__input field__input--code"
              name="lobby-code"
              type="text"
              value={code}
              onChange={(event) => {
                setCode(
                  normalizeLobbyCode(event.target.value),
                );
                setMessage(null);
              }}
              placeholder="X7K2"
              minLength={LOBBY_CODE_LENGTH}
              maxLength={LOBBY_CODE_LENGTH}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              required
              disabled={submitting}
            />

            <span className="field__hint">
              {code.length}/{LOBBY_CODE_LENGTH}
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
            {submitting ? 'Connexion…' : 'Rejoindre'}
          </button>

          <Link
            className="button button--ghost button--full"
            to="/"
          >
            Retour
          </Link>
        </form>
      </section>
    </AppShell>
  );
}
