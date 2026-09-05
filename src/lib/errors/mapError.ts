import type { PostgrestError } from '@supabase/supabase-js';
import { AppError } from './AppError';

const ERROR_MESSAGES = {
  INVALID_NICKNAME:
    'Le pseudo doit contenir entre 1 et 24 caractères.',
  NICKNAME_TAKEN:
    'Ce pseudo est déjà utilisé dans cette partie. Choisis-en un autre.',
  INVALID_CODE:
    'Le code de la partie doit contenir 4 caractères.',
  LOBBY_NOT_FOUND:
    'Cette partie est introuvable ou a expiré.',
  LOBBY_FULL:
    'Cette partie est complète. Elle contient déjà 4 joueurs.',
  SESSION_EXPIRED:
    'Ta session temporaire a expiré. Rejoins à nouveau la partie.',
  NOT_LOBBY_MEMBER:
    'Tu ne fais plus partie de ce lobby.',
    HOST_ONLY:
    'Seul le host peut effectuer cette action.',
  INVALID_GAME_STATE:
    'Cette action n’est pas disponible à cette étape de la partie.',
  INVALID_VIDEO:
    'Cette vidéo YouTube n’est pas valide.',
  VIDEO_REQUIRED:
    'Choisis une vidéo avant de préparer la manche.',
  ROUND_NOT_FOUND:
    'La manche actuelle est introuvable.',
  PLAYERS_NOT_READY:
    'Tous les joueurs avec un microphone ne sont pas encore prêts.',
  ROUND_NOT_STARTED_YET:
    'Le compte à rebours n’est pas encore terminé.',
  INVALID_RECORDING_ATTEMPT:
    'Cet essai d’enregistrement n’est pas autorisé.',
  INVALID_RECORDING:
    'Le fichier audio enregistré n’est pas valide.',
  INVALID_RECORDING_PATH:
    'Le chemin du fichier audio est invalide.',
  RECORDING_NOT_FOUND:
    'Cet enregistrement est introuvable.',
} as const;

function getErrorSource(
  error: PostgrestError | Error,
): string {
  if ('details' in error) {
    return [
      error.code,
      error.message,
      error.details,
      error.hint,
    ]
      .filter(
        (value): value is string =>
          typeof value === 'string',
      )
      .join(' ');
  }

  return error.message;
}

export function mapSupabaseError(
  error: PostgrestError | Error,
): AppError {
  const source = getErrorSource(error);
  const normalizedSource = source.toLowerCase();

  for (const [errorCode, message] of Object.entries(
    ERROR_MESSAGES,
  )) {
    if (source.includes(errorCode)) {
      return new AppError(
        errorCode as keyof typeof ERROR_MESSAGES,
        message,
        { cause: error },
      );
    }
  }

  if (
    normalizedSource.includes(
      'players_unique_active_nickname_idx',
    ) ||
    (
      normalizedSource.includes('duplicate key') &&
      normalizedSource.includes('nickname')
    )
  ) {
    return new AppError(
      'NICKNAME_TAKEN',
      ERROR_MESSAGES.NICKNAME_TAKEN,
      { cause: error },
    );
  }

  if (
    normalizedSource.includes('failed to fetch') ||
    normalizedSource.includes('network') ||
    normalizedSource.includes('load failed')
  ) {
    return new AppError(
      'NETWORK_ERROR',
      'Impossible de contacter DubMania. Vérifie ta connexion.',
      { cause: error },
    );
  }

  if (import.meta.env.DEV) {
    console.error(
      '[DubMania] Erreur Supabase non reconnue :',
      error,
    );
  }

  return new AppError(
    'DATABASE_ERROR',
    'Une erreur empêche DubMania d’accéder à la partie.',
    { cause: error },
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur inattendue est survenue.';
}
