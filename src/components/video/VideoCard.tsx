import { Check, Clock3, Users } from 'lucide-react';
import { formatDuration } from '../../lib/format';
import type { CatalogVideo } from '../../types/video';

interface VideoCardProps {
  video: CatalogVideo;
  selected: boolean;
  played: boolean;
  onSelect: (video: CatalogVideo) => void;
}

export function VideoCard({
  video,
  selected,
  played,
  onSelect,
}: VideoCardProps) {
  return (
    <article
      className={[
        'video-card',
        selected ? 'video-card--selected' : '',
        played ? 'video-card--played' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {played ? (
        <span className="video-card__played">
          <Check size={15} aria-hidden="true" />
          Déjà jouée
        </span>
      ) : null}

      <img
        className="video-card__thumbnail"
        src={video.thumbnail}
        alt=""
        loading="lazy"
      />

      <div className="video-card__body">
        <h3>{video.title}</h3>

        <div className="video-card__meta">
          <span>
            <Users size={16} aria-hidden="true" />
            {video.requiredPlayers}{' '}
            {video.requiredPlayers === 1
              ? 'joueur'
              : 'joueurs'}
          </span>

          <span>
            <Clock3 size={16} aria-hidden="true" />
            {formatDuration(video.duration)}
          </span>
        </div>

        {video.description ? (
          <p>{video.description}</p>
        ) : null}

        <button
          className={[
            'button',
            'button--compact',
            selected
              ? 'button--success'
              : 'button--secondary',
          ].join(' ')}
          type="button"
          onClick={() => onSelect(video)}
        >
          {selected ? (
            <>
              <Check size={18} aria-hidden="true" />
              Sélectionnée
            </>
          ) : (
            'Choisir'
          )}
        </button>
      </div>
    </article>
  );
}
