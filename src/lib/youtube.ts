const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeId(input: string): string | null {
  const value = input.trim();

  if (YOUTUBE_ID_PATTERN.test(value)) {
    return value;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

  if (hostname === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  if (
    hostname === 'youtube.com' ||
    hostname === 'm.youtube.com' ||
    hostname === 'music.youtube.com'
  ) {
    const directId = url.searchParams.get('v');

    if (directId && YOUTUBE_ID_PATTERN.test(directId)) {
      return directId;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const markerIndex = parts.findIndex((part) =>
      ['embed', 'shorts', 'live'].includes(part),
    );
    const id =
      markerIndex >= 0 ? parts[markerIndex + 1] : undefined;

    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  }

  return null;
}

export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
