import { catalogSchema, type CatalogVideo } from '../types/video';
import {
  extractYouTubeId,
  youtubeThumbnail,
} from '../lib/youtube';

export class VideoService {
  async getCatalog(): Promise<CatalogVideo[]> {
    const response = await fetch(
      `${import.meta.env.BASE_URL}videos.json`,
      {
        cache: 'no-cache',
      },
    );

    if (!response.ok) {
      throw new Error(
        'Le catalogue vidéo ne peut pas être chargé.',
      );
    }

    const json: unknown = await response.json();
    return catalogSchema.parse(json);
  }

  fromManualUrl(input: string) {
    const youtubeId = extractYouTubeId(input);

    if (!youtubeId) {
      throw new Error(
        'Ce lien YouTube ne semble pas valide.',
      );
    }

    return {
      source: 'manual' as const,
      catalogId: null,
      youtubeId,
      title: 'Vidéo YouTube personnalisée',
      thumbnail: youtubeThumbnail(youtubeId),
      description: '',
      requiredPlayers: null,
      category: null,
      duration: null,
    };
  }
}

export const videoService = new VideoService();
