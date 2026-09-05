import { supabase } from '../lib/supabase';
import { lobbySnapshotSchema } from '../lib/lobbySchema';
import { mapSupabaseError } from '../lib/errors/mapError';
import type {
  LobbySnapshot,
  StoredLobbySession,
} from '../types/lobby';
import type { SelectedVideo } from '../types/video';
import type { Json } from '../types/database';


const SESSION_STORAGE_KEY = 'dubmania-lobby-session';

function normalizeNickname(nickname: string): string {
  return nickname.trim().replace(/\s+/g, ' ');
}

function normalizeCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

export class LobbyService {
  async create(nickname: string): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'create_lobby',
      {
        p_nickname: normalizeNickname(nickname),
      },
    );

    if (error) {
      throw mapSupabaseError(error);
    }

    const snapshot = lobbySnapshotSchema.parse(data);
    this.saveSession(snapshot);
    return snapshot;
  }

  async join(
    code: string,
    nickname: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'join_lobby',
      {
        p_code: normalizeCode(code),
        p_nickname: normalizeNickname(nickname),
      },
    );

    if (error) {
      throw mapSupabaseError(error);
    }

    const snapshot = lobbySnapshotSchema.parse(data);
    this.saveSession(snapshot);
    return snapshot;
  }

  async getSnapshot(
    code: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'get_lobby_snapshot',
      {
        p_code: normalizeCode(code),
      },
    );

    if (error) {
      throw mapSupabaseError(error);
    }

    return lobbySnapshotSchema.parse(data);
  }

  async heartbeat(playerId: string): Promise<void> {
    const { error } = await supabase.rpc(
      'heartbeat_player',
      {
        p_player_id: playerId,
      },
    );

    if (error) {
      throw mapSupabaseError(error);
    }
  }

  async leave(playerId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_lobby', {
      p_player_id: playerId,
    });

    if (error) {
      throw mapSupabaseError(error);
    }

    this.clearSession();
  }

  async selectVideo(
    lobbyId: string,
    video: SelectedVideo,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'select_lobby_video',
      {
        p_lobby_id: lobbyId,
        p_video: selectedVideoToJson(video),
      },
    );

    if (error) {
      throw mapSupabaseError(error);
    }

    const snapshot = lobbySnapshotSchema.parse(data);
    this.saveSession(snapshot);
    return snapshot;
  }

  async clearVideo(
    lobbyId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'clear_lobby_video',
      {
        p_lobby_id: lobbyId,
      },
    );

    if (error) {
      throw mapSupabaseError(error);
    }

    const snapshot = lobbySnapshotSchema.parse(data);
    this.saveSession(snapshot);
    return snapshot;
  }

  getStoredSession(): StoredLobbySession | null {
    try {
      const value = localStorage.getItem(
        SESSION_STORAGE_KEY,
      );

      if (!value) return null;

      const parsed = JSON.parse(
        value,
      ) as Partial<StoredLobbySession>;

      if (
        typeof parsed.lobbyId !== 'string' ||
        typeof parsed.lobbyCode !== 'string' ||
        typeof parsed.playerId !== 'string'
      ) {
        this.clearSession();
        return null;
      }

      return {
        lobbyId: parsed.lobbyId,
        lobbyCode: parsed.lobbyCode,
        playerId: parsed.playerId,
      };
    } catch {
      this.clearSession();
      return null;
    }
  }

  clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private saveSession(snapshot: LobbySnapshot): void {
    const session: StoredLobbySession = {
      lobbyId: snapshot.lobby.id,
      lobbyCode: snapshot.lobby.code,
      playerId: snapshot.currentPlayerId,
    };

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );
  }
}

function selectedVideoToJson(
  video: SelectedVideo,
): Json {
  return {
    source: video.source,
    catalogId: video.catalogId,
    youtubeId: video.youtubeId,
    title: video.title,
    thumbnail: video.thumbnail,
    description: video.description,
    requiredPlayers: video.requiredPlayers,
    category: video.category,
    duration: video.duration,
  };
}

export const lobbyService = new LobbyService();
