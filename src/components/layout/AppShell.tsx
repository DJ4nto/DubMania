import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppLogo } from '../common/AppLogo';

interface AppShellProps extends PropsWithChildren {
  title?: string;
  description?: string;
  actions?: ReactNode;
  compactLogo?: boolean;
}

export function AppShell({
  title,
  description,
  actions,
  compactLogo = true,
  children,
}: AppShellProps) {
  return (
    <main className="app-page">
      <section className="app-container">
        <header className="app-header">
          <Link
            className={[
              'app-header__logo-link',
              compactLogo
                ? 'app-header__logo-link--compact'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            to="/"
            aria-label="Retour à l’accueil de DubMania"
          >
            <AppLogo compact={compactLogo} />
          </Link>

          {title ? <h1 className="page-title">{title}</h1> : null}

          {description ? (
            <p className="page-description">{description}</p>
          ) : null}

          {actions ? (
            <div className="app-header__actions">{actions}</div>
          ) : null}
        </header>

        <div className="app-content">{children}</div>
      </section>
    </main>
  );
}
