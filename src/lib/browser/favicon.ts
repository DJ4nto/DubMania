import faviconUrl from '../../assets/branding/dubmania-icon.png';

const FAVICON_SELECTOR =
  'link[rel="icon"][data-dubmania-favicon]';

export function installFavicon(): void {
  const existingLink =
    document.head.querySelector<HTMLLinkElement>(
      FAVICON_SELECTOR,
    );

  const link =
    existingLink ?? document.createElement('link');

  link.rel = 'icon';
  link.type = 'image/png';
  link.href = faviconUrl;
  link.dataset.dubmaniaFavicon = 'true';

  if (!existingLink) {
    document.head.appendChild(link);
  }
}
