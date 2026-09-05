import { useEffect } from 'react';
import { HEARTBEAT_INTERVAL_MS } from '../config/constants';
import { lobbyService } from '../services/LobbyService';

export function useHeartbeat(
  playerId: string | null,
): void {
  useEffect(() => {
    if (playerId === null) {
      return;
    }

    const activePlayerId = playerId;

    let active = true;
    let running = false;

    async function heartbeat(): Promise<void> {
      if (!active || running) {
        return;
      }

      running = true;

      try {
        await lobbyService.heartbeat(activePlayerId);
      } catch (error) {
        console.warn(
          '[DubMania] Heartbeat impossible :',
          error,
        );
      } finally {
        running = false;
      }
    }

    void heartbeat();

    const intervalId = window.setInterval(() => {
      void heartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    const handleOnline = (): void => {
      void heartbeat();
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void heartbeat();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    );

    return () => {
      active = false;

      window.clearInterval(intervalId);
      window.removeEventListener(
        'online',
        handleOnline,
      );
      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      );
    };
  }, [playerId]);
}
