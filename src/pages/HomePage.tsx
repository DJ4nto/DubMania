import { Link } from 'react-router-dom';
import { AppLogo } from '../components/common/AppLogo';

export function HomePage() {
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
            1 à 4 joueurs · aucun compte · microphone facultatif
          </p>
        </section>
      </div>
    </main>
  );
}
