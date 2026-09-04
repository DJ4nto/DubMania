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
      throw sessionError;
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
      throw error;
    }

    if (!data.session || !data.user) {
      throw new Error(
        'Impossible de créer la session temporaire DubMania.',
      );
    }

    return {
      session: data.session,
      user: data.user,
    };
  }
}

export const authService = new AuthService();
