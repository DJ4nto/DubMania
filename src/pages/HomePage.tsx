import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AppLogo } from '../components/common/AppLogo';
import { ResumeLobbyCard } from '../components/lobby/ResumeLobbyCard';
import { lobbyService } from '../services/LobbyService';

export function HomePage() {
  const [storedSession, setStoredSession] = useState(
    () => lobbyService.getStoredSession(),
  );

  return (
    <main className="home-page">
      <div className="home-page__content">
        <header className="home-page__symbol">
          <AppLogo display="symbol" />
        </header>

        <section className="hero panel">
          <AppLogo display="text" />

          <p className="hero__tagline">
            Le jeu de doublage entre amis
          </p>

          {storedSession ? (
            <ResumeLobbyCard
              session={storedSession}
              onForget={() => {
                lobbyService.clearSession();
                setStoredSession(null);
              }}
            />
          ) : null}

          <div className="hero__actions">
            <Link
              className="button button--primary"
              to="/creer"
            >
              Créer une partie
            </Link>

            <Link
              className="button button--secondary"
              to="/rejoindre"
            >
              Rejoindre une partie
            </Link>
          </div>

          <p className="hero__note">
            1 à 4 joueurs · aucun compte
          </p>
        </section>
      </div>
    </main>
  );
}
