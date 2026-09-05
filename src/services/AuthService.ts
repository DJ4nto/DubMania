import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export class AuthService {
  async ensureAnonymousSession(): Promise<{
    session: Session;
    user: User;
  }> {
    const {
      data: { session: existingSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(
        `Lecture de la session Supabase impossible : ${sessionError.message}`,
        { cause: sessionError },
      );
    }

    if (existingSession) {
      return {
        session: existingSession,
        user: existingSession.user,
      };
    }

    const { data, error } =
      await supabase.auth.signInAnonymously();

    if (error) {
      throw new Error(
        `Connexion anonyme Supabase refusée : ${error.message}`,
        { cause: error },
      );
    }

    if (!data.session || !data.user) {
      throw new Error(
        'Supabase a répondu sans fournir de session utilisateur.',
      );
    }

    return {
      session: data.session,
      user: data.user,
    };
  }
}

export const authService = new AuthService();
