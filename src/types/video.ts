import { z } from 'zod';

export const catalogVideoSchema = z.object({
  id: z.string().min(1).max(80),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(1).max(160),
  thumbnail: z.string().url(),
  description: z.string().max(500).default(''),
  requiredPlayers: z.number().int().min(1).max(4),
  category: z.string().min(1).max(50),
  duration: z.number().int().positive().max(3600),
});

export const catalogSchema = z.array(catalogVideoSchema);

export type CatalogVideo = z.infer<typeof catalogVideoSchema>;

export interface SelectedVideo {
  source: 'catalog' | 'manual';
  catalogId: string | null;
  youtubeId: string;
  title: string;
  thumbnail: string;
  description: string;
  requiredPlayers: 1 | 2 | 3 | 4 | null;
  category: string | null;
  duration: number | null;
}
