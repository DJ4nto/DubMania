import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function ConnectionBanner() {
  const [online, setOnline] = useState(
    navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = (): void => setOnline(true);
    const handleOffline = (): void => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener(
        'online',
        handleOnline,
      );
      window.removeEventListener(
        'offline',
        handleOffline,
      );
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div
      className="connection-banner"
      role="status"
      aria-live="assertive"
    >
      <WifiOff size={19} aria-hidden="true" />
      Connexion perdue. DubMania essaie de se
      reconnecter…
    </div>
  );
}
