import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Film } from 'lucide-react';
import { Loader } from '../common/Loader';
import { VideoCard } from './VideoCard';
import { ManualVideoForm } from './ManualVideoForm';
import { videoService } from '../../services/VideoService';
import type {
  CatalogVideo,
  SelectedVideo,
} from '../../types/video';

interface VideoCatalogProps {
  selectedVideo: SelectedVideo | null;
  playedVideoIds: string[];
  onSelect: (video: SelectedVideo) => Promise<void>;
}

type PlayerFilter = 1 | 2 | 3 | 4 | 'ALL';

export function VideoCatalog({
  selectedVideo,
  playedVideoIds,
  onSelect,
}: VideoCatalogProps) {
  const [videos, setVideos] = useState<CatalogVideo[]>([]);
  const [filter, setFilter] =
    useState<PlayerFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] =
    useState<string | null>(null);
  const scrollContainerRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
    });
  }, [filter]);

  useEffect(() => {
    let active = true;

    videoService
      .getCatalog()
      .then((catalog) => {
        if (active) {
          setVideos(catalog);
          setError(null);
        }
      })
      .catch((caughtError) => {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Le catalogue ne peut pas être chargé.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredVideos = useMemo(() => {
    if (filter === 'ALL') return videos;

    return videos.filter(
      (video) => video.requiredPlayers === filter,
    );
  }, [filter, videos]);

  async function handleCatalogSelect(
    video: CatalogVideo,
  ): Promise<void> {
    setSelectingId(video.id);

    try {
      await onSelect(videoService.fromCatalog(video));
    } finally {
      setSelectingId(null);
    }
  }

  if (loading) {
    return <Loader label="Chargement des vidéos…" />;
  }

  return (
    <section className="video-catalog">
      <div className="section-heading">
        <h2>
          <Film size={25} aria-hidden="true" />
          Vidéos
        </h2>
      </div>

      <ManualVideoForm onSelect={onSelect} />

      {selectedVideo ? (
        <div className="video-catalog__selection">
          <img
            src={selectedVideo.thumbnail}
            alt=""
          />
          <div>
            <span className="eyebrow">
              Vidéo sélectionnée
            </span>
            <strong>{selectedVideo.title}</strong>
            {selectedVideo.requiredPlayers ? (
              <span>
                Prévue pour {selectedVideo.requiredPlayers}{' '}
                {selectedVideo.requiredPlayers === 1
                  ? 'joueur'
                  : 'joueurs'}
              </span>
            ) : (
              <span>Lien YouTube personnalisé</span>
            )}
          </div>
        </div>
      ) : null}

      <div
        className="video-filters"
        aria-label="Filtrer par nombre de joueurs"
      >
        <button
          className={filter === 'ALL' ? 'is-active' : ''}
          type="button"
          onClick={() => setFilter('ALL')}
        >
          Toutes
        </button>

        {([1, 2, 3, 4] as const).map((count) => (
          <button
            key={count}
            className={
              filter === count ? 'is-active' : ''
            }
            type="button"
            onClick={() => setFilter(count)}
          >
            {count}{' '}
            {count === 1 ? 'joueur' : 'joueurs'}
          </button>
        ))}
      </div>

      {error ? (
        <p className="form-message" role="alert">
          {error}
        </p>
      ) : null}

      {!error && filteredVideos.length === 0 ? (
        <p className="waiting-message">
          Aucune vidéo ne correspond à ce filtre.
        </p>
      ) : null}

      {!error && filteredVideos.length > 0 ? (
        <div
          ref={scrollContainerRef}
          className="video-catalog__scroll"
          role="region"
          aria-label="Catalogue des vidéos"
          tabIndex={0}
        >
          <div className="video-catalog__scroll-header">
            <span>
              {filteredVideos.length}{' '}
              {filteredVideos.length === 1
                ? 'vidéo affichée'
                : 'vidéos affichées'}
            </span>

            <span>Fais défiler pour voir la suite</span>
          </div>

          <div className="video-grid">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                aria-busy={selectingId === video.id}
              >
                <VideoCard
                  video={video}
                  selected={
                    selectedVideo?.catalogId === video.id
                  }
                  played={playedVideoIds.includes(video.id)}
                  onSelect={(selected) => {
                    void handleCatalogSelect(selected);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
