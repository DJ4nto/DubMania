import { useState } from 'react';
import logoUrl from '../../assets/branding/dubmania-logo.webp';

interface AppLogoProps {
  compact?: boolean;
  display?: 'full' | 'symbol' | 'text';
}

export function AppLogo({
  compact = false,
  display = 'full',
}: AppLogoProps) {
  const [imageError, setImageError] = useState(false);

  const showSymbol =
    display === 'full' || display === 'symbol';

  const showText =
    display === 'full' || display === 'text';

  return (
    <span
      className={[
        'app-logo',
        compact ? 'app-logo--compact' : '',
        display === 'symbol'
          ? 'app-logo--symbol-only'
          : '',
        display === 'text'
          ? 'app-logo--text-only'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={
        display === 'symbol' ? undefined : 'DubMania'
      }
      aria-hidden={
        display === 'symbol' ? 'true' : undefined
      }
    >
      {showSymbol && !imageError ? (
        <img
          className="app-logo__symbol"
          src={logoUrl}
          alt=""
          decoding="async"
          onError={() => setImageError(true)}
        />
      ) : null}

      {showText ? (
        <span className="app-logo__text">
          DUBMANIA
        </span>
      ) : null}
    </span>
  );
}
