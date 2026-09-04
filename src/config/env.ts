import { z } from 'zod';

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  VITE_BASE_PATH: z.string().default('/'),
  VITE_DEBUG: z.enum(['true', 'false']).default('false'),
});

const result = schema.safeParse(import.meta.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `Configuration DubMania invalide.\n${details}\n` +
      'Copiez .env.example vers .env et complétez les valeurs.',
  );
}

export const env = {
  supabaseUrl: result.data.VITE_SUPABASE_URL,
  supabasePublishableKey:
    result.data.VITE_SUPABASE_PUBLISHABLE_KEY,
  basePath: result.data.VITE_BASE_PATH,
  debug: result.data.VITE_DEBUG === 'true',
} as const;
