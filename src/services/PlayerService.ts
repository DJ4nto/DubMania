import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/errors/mapError';
import type { MicrophoneState } from '../types/game';

export class PlayerService {
  async updateMicrophoneState(
    playerId: string,
    microphoneState: MicrophoneState,
  ): Promise<void> {
    const { error } = await supabase.rpc(
      'update_microphone_state',
      {
        p_player_id: playerId,
        p_microphone_state: microphoneState,
      },
    );

    if (error) {
      throw mapSupabaseError(error);
    }
  }
}

export const playerService = new PlayerService();
