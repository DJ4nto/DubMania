import { create } from 'zustand';
import type { LobbySnapshot } from '../types/lobby';

interface LobbyStore {
  snapshot: LobbySnapshot | null;
  loading: boolean;
  error: string | null;

  setSnapshot: (snapshot: LobbySnapshot | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useLobbyStore = create<LobbyStore>()((set) => ({
  snapshot: null,
  loading: false,
  error: null,

  setSnapshot: (snapshot) => {
    set({
      snapshot,
      error: null,
    });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setError: (error) => {
    set({ error });
  },

  reset: () => {
    set({
      snapshot: null,
      loading: false,
      error: null,
    });
  },
}));
