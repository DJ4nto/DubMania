import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { authService } from '../services/AuthService';
import { Loader } from '../components/common/Loader';

interface AuthContextValue {
  user: User;
}

export const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AppProviders({
  children,
}: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    authService
        .ensureAnonymousSession()
        .then(({ user: sessionUser }) => {
            if (active) setUser(sessionUser);
        })
        .catch((caughtError: unknown) => {
        console.error(
            '[DubMania] Échec de la session Supabase anonyme :',
            caughtError,
        );

        const technicalMessage =
            caughtError instanceof Error
            ? caughtError.message
            : 'Erreur Supabase inconnue';

        if (active) {
            setError(
            import.meta.env.DEV
                ? `DubMania ne peut pas créer ta session temporaire. Détail : ${technicalMessage}`
                : 'DubMania ne peut pas créer ta session temporaire. Vérifie ta connexion puis réessaie.',
            );
        }
        });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => (user ? { user } : null),
    [user],
  );

    if (error) {
    return (
        <main className="centered-page">
        <section className="panel connection-error" role="alert">
            <h1>Connexion impossible</h1>
            <p>{error}</p>

            <button
            className="button button--primary"
            type="button"
            onClick={() => window.location.reload()}
            >
            Réessayer
            </button>
        </section>
        </main>
    );
    }


  if (!value) {
    return <Loader label="Préparation de DubMania…" />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
