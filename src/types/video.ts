import { z } from 'zod';

export const requiredPlayersSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const catalogVideoSchema = z.object({
  id: z.string().min(1).max(80),
  youtubeId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(1).max(160),
  thumbnail: z.string().url(),
  description: z.string().max(500).default(''),
  requiredPlayers: requiredPlayersSchema,
  category: z.string().min(1).max(50),
  duration: z
    .number()
    .int()
    .positive()
    .max(3600),
});

export const catalogSchema = z.array(
  catalogVideoSchema,
);

export type RequiredPlayers = z.infer<
  typeof requiredPlayersSchema
>;

export type CatalogVideo = z.infer<
  typeof catalogVideoSchema
>;

export interface SelectedVideo {
  source: 'catalog' | 'manual';
  catalogId: string | null;
  youtubeId: string;
  title: string;
  thumbnail: string;
  description: string;
  requiredPlayers: RequiredPlayers | null;
  category: string | null;
  duration: number | null;
}
