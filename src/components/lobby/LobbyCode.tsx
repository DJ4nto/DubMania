import { useEffect, useState } from 'react';
import {
  Check,
  Clipboard,
  Eye,
  EyeOff,
} from 'lucide-react';

interface LobbyCodeProps {
  code: string;
}

export function LobbyCode({
  code,
}: LobbyCodeProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setCopied(false);
  }, [code]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2_000);
    } catch {
      // Ancien fallback pour les navigateurs où Clipboard API
      // n'est pas disponible.
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';

      document.body.appendChild(textArea);
      textArea.select();

      const copiedSuccessfully =
        document.execCommand('copy');

      document.body.removeChild(textArea);

      if (copiedSuccessfully) {
        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 2_000);
      } else {
        setCopyError(true);
      }
    }
  }

  return (
    <div className="lobby-code-panel">
      <span className="eyebrow">
        Code de la partie
      </span>

      <div
        className={[
          'lobby-code-display',
          revealed
            ? 'lobby-code-display--revealed'
            : 'lobby-code-display--hidden',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <strong
          className="lobby-code"
          aria-label={
            revealed
              ? `Code de la partie : ${code}`
              : 'Code de la partie masqué'
          }
        >
          {revealed ? code : '••••'}
        </strong>

        {!revealed ? (
          <span className="lobby-code-display__mask">
            Code masqué
          </span>
        ) : null}
      </div>

      <p className="lobby-code-panel__hint">
        {revealed
          ? 'Partage ce code uniquement avec les joueurs que tu veux inviter.'
          : 'Dévoile le code lorsque tes amis sont prêts à rejoindre.'}
      </p>

      <div className="lobby-code-panel__actions">
        <button
          className="button button--secondary button--compact"
          type="button"
          onClick={() => {
            setRevealed((current) => !current);
            setCopied(false);
          }}
          aria-expanded={revealed}
        >
          {revealed ? (
            <>
              <EyeOff size={20} aria-hidden="true" />
              Masquer le code
            </>
          ) : (
            <>
              <Eye size={20} aria-hidden="true" />
              Dévoiler le code
            </>
          )}
        </button>

        {revealed ? (
          <button
            className={[
              'button',
              'button--compact',
              copied
                ? 'button--success'
                : 'button--ghost',
            ].join(' ')}
            type="button"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check size={20} aria-hidden="true" />
                Copié !
              </>
            ) : (
              <>
                <Clipboard
                  size={20}
                  aria-hidden="true"
                />
                Copier
              </>
            )}
          </button>
        ) : null}
      </div>

      <span className="sr-only" aria-live="polite">
        {copied
          ? 'Le code de la partie a été copié.'
          : ''}
      </span>
    </div>
  );
}
