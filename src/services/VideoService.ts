import {
  catalogSchema,
  type CatalogVideo,
  type SelectedVideo,
} from '../types/video';
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

  fromCatalog(
    video: CatalogVideo,
  ): SelectedVideo {
    return {
      source: 'catalog',
      catalogId: video.id,
      youtubeId: video.youtubeId,
      title: video.title,
      thumbnail: video.thumbnail,
      description: video.description,
      requiredPlayers: video.requiredPlayers,
      category: video.category,
      duration: video.duration,
    };
  }

  fromManualUrl(input: string): SelectedVideo {
    const youtubeId = extractYouTubeId(input);

    if (!youtubeId) {
      throw new Error(
        'Ce lien YouTube ne semble pas valide.',
      );
    }

    return {
      source: 'manual',
      catalogId: null,
      youtubeId,
      title: 'Vidéo YouTube personnalisée',
      thumbnail: youtubeThumbnail(youtubeId),
      description: 'Vidéo choisie manuellement par le host.',
      requiredPlayers: null,
      category: null,
      duration: null,
    };
  }
}

export const videoService = new VideoService();
