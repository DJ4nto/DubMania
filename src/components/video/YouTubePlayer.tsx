import type { RefObject } from 'react';
import type { YouTubeStatus } from '../../hooks/useYouTubePlayer';

interface YouTubePlayerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  status: YouTubeStatus;
  error: string | null;
}

const STATUS_LABELS: Record<YouTubeStatus, string> = {
  LOADING_API: 'Chargement de YouTube…',
  CREATING: 'Création du lecteur…',
  CUED: 'Vidéo prête',
  PLAYING: 'Lecture en cours',
  BUFFERING: 'Mise en mémoire tampon…',
  PAUSED: 'Vidéo prête',
  ENDED: 'Vidéo terminée',
  ERROR: 'Erreur vidéo',
};

export function YouTubePlayer({
  containerRef,
  status,
  error,
}: YouTubePlayerProps) {
  return (
    <section className="youtube-player-shell">
      <div className="youtube-player-frame">
        <div
          ref={containerRef}
          className="youtube-player-target"
        />
      </div>

      <div
        className={[
          'youtube-status',
          status === 'ERROR'
            ? 'youtube-status--error'
            : '',
          status === 'CUED'
            ? 'youtube-status--ready'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="status"
      >
        {error ?? STATUS_LABELS[status]}
      </div>
    </section>
  );
}
