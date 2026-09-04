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
      .catch(() => {
        if (active) {
          setError(
            'DubMania ne peut pas créer ta session temporaire. Vérifie la configuration Supabase et ta connexion.',
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
        <section className="panel" role="alert">
          <h1>Connexion impossible</h1>
          <p>{error}</p>
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
