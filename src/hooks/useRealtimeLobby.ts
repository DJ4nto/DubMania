import {
  useEffect,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';

interface UseRealtimeLobbyOptions {
  lobbyId: string | null;
  onChange: () => void | Promise<void>;
}

const FALLBACK_REFRESH_INTERVAL_MS = 5_000;
const CHANGE_DEBOUNCE_MS = 100;

export function useRealtimeLobby({
  lobbyId,
  onChange,
}: UseRealtimeLobbyOptions): void {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!lobbyId) {
      return;
    }

    let active = true;
    let refreshTimer: number | null = null;
    let refreshRunning = false;

    async function refresh(): Promise<void> {
      if (!active || refreshRunning) {
        return;
      }

      refreshRunning = true;

      try {
        await onChangeRef.current();
      } catch (error) {
        console.warn(
          '[DubMania] Actualisation du lobby impossible :',
          error,
        );
      } finally {
        refreshRunning = false;
      }
    }

    function scheduleRefresh(): void {
      if (!active) {
        return;
      }

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refresh();
      }, CHANGE_DEBOUNCE_MS);
    }

    const channel = supabase
      .channel(`lobby:${lobbyId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobbyId}`,
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.info(
              '[DubMania] Changement Realtime du lobby :',
              payload,
            );
          }

          scheduleRefresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        (payload) => {
        const oldPlayer =
            payload.old as Record<string, unknown> | null;
        const newPlayer =
            payload.new as Record<string, unknown> | null;

        const isHeartbeatOnly =
            payload.eventType === 'UPDATE' &&
            oldPlayer !== null &&
            newPlayer !== null &&
            oldPlayer.nickname === newPlayer.nickname &&
            oldPlayer.connected === newPlayer.connected &&
            oldPlayer.microphone_state ===
            newPlayer.microphone_state &&
            oldPlayer.round_status ===
            newPlayer.round_status &&
            oldPlayer.left_at === newPlayer.left_at;

        if (import.meta.env.DEV && !isHeartbeatOnly) {
            console.info(
            '[DubMania] Changement Realtime des joueurs :',
            payload,
            );
        }

        if (!isHeartbeatOnly) {
            scheduleRefresh();
        }
        },

      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rounds',
          filter: `lobby_id=eq.${lobbyId}`,
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.info(
              '[DubMania] Changement Realtime de manche :',
              payload,
            );
          }

          scheduleRefresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.info(
              '[DubMania] Changement Realtime des enregistrements :',
              payload,
            );
          }

          scheduleRefresh();
        },
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          if (import.meta.env.DEV) {
            console.info(
              `[DubMania] Realtime connecté au lobby ${lobbyId}.`,
            );
          }

          // Une modification peut être intervenue entre le premier
          // chargement HTTP et l'ouverture effective du canal.
          void refresh();
          return;
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.error(
            `[DubMania] Realtime indisponible (${status}).`,
            error,
          );
        }

        if (
          status === 'CLOSED' &&
          import.meta.env.DEV
        ) {
          console.warn(
            `[DubMania] Canal Realtime fermé pour ${lobbyId}.`,
          );
        }
      });

    // Filet de sécurité : récupération périodique depuis la base.
    const fallbackInterval = window.setInterval(() => {
      void refresh();
    }, FALLBACK_REFRESH_INTERVAL_MS);

    const handleOnline = (): void => {
      void refresh();
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    );

    return () => {
      active = false;

      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }

      window.clearInterval(fallbackInterval);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
      );

      void supabase.removeChannel(channel);
    };
  }, [lobbyId]);
}
