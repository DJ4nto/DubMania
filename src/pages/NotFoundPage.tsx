import { Link } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';

export function NotFoundPage() {
  return (
    <AppShell
      title="Page introuvable"
      description="Cette adresse ne correspond à aucun écran DubMania."
    >
      <section className="empty-state panel">
        <div className="empty-state__code" aria-hidden="true">
          404
        </div>

        <p>
          Le lobby a peut-être expiré ou l’adresse est incorrecte.
        </p>

        <Link
          className="button button--primary"
          to="/"
        >
          Retour à l’accueil
        </Link>
      </section>
    </AppShell>
  );
}
