import { supabase } from '../lib/supabase';
import { lobbySnapshotSchema } from '../lib/lobbySchema';
import { mapSupabaseError } from '../lib/errors/mapError';
import type { LobbySnapshot } from '../types/lobby';

export class GameStateService {
  async prepareRound(
    lobbyId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'prepare_round',
      {
        p_lobby_id: lobbyId,
      },
    );

    if (error) throw mapSupabaseError(error);
    return lobbySnapshotSchema.parse(data);
  }

  async markReady(
    playerId: string,
    roundId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'set_player_round_ready',
      {
        p_player_id: playerId,
        p_round_id: roundId,
      },
    );

    if (error) throw mapSupabaseError(error);
    return lobbySnapshotSchema.parse(data);
  }

  async scheduleStart(
    lobbyId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'schedule_round_start',
      {
        p_lobby_id: lobbyId,
      },
    );

    if (error) throw mapSupabaseError(error);
    return lobbySnapshotSchema.parse(data);
  }

  async confirmStarted(
    lobbyId: string,
    roundId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'confirm_round_started',
      {
        p_lobby_id: lobbyId,
        p_round_id: roundId,
      },
    );

    if (error) throw mapSupabaseError(error);
    return lobbySnapshotSchema.parse(data);
  }

  async cancelPreparation(
    lobbyId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'cancel_round_preparation',
      {
        p_lobby_id: lobbyId,
      },
    );

    if (error) throw mapSupabaseError(error);
    return lobbySnapshotSchema.parse(data);
  }
}

export const gameStateService =
  new GameStateService();
