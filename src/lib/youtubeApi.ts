import type { YouTubeNamespace } from '../types/youtube';

let apiPromise: Promise<YouTubeNamespace> | null = null;

export function loadYouTubeApi():
  Promise<YouTubeNamespace> {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previousCallback =
      window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(
          new Error(
            'L’API YouTube a répondu sans lecteur.',
          ),
        );
      }
    };

    const existingScript =
      document.querySelector<HTMLScriptElement>(
        'script[data-dubmania-youtube-api]',
      );

    if (!existingScript) {
      const script = document.createElement('script');

      script.src =
        'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.dubmaniaYoutubeApi = 'true';

      script.addEventListener(
        'error',
        () => {
          apiPromise = null;
          reject(
            new Error(
              'Impossible de charger le lecteur YouTube.',
            ),
          );
        },
        { once: true },
      );

      document.head.appendChild(script);
    }

    window.setTimeout(() => {
      if (!window.YT?.Player) {
        apiPromise = null;
        reject(
          new Error(
            'Le chargement de YouTube a pris trop de temps.',
          ),
        );
      }
    }, 15_000);
  });

  return apiPromise;
}
