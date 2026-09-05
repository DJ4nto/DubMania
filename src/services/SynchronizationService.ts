import { supabase } from '../lib/supabase';
import { ClockEstimator } from '../lib/time/clockEstimator';

interface ServerTimeResponse {
  epoch_ms: number;
}

export class SynchronizationService {
  readonly clock = new ClockEstimator();

  async synchronize(samples = 7): Promise<void> {
    for (let index = 0; index < samples; index += 1) {
      const sentAt = Date.now();

      const { data, error } = await supabase.rpc(
        'get_server_time',
      );


      const receivedAt = Date.now();

      if (error) {
        throw error;
      }

      const result = data as unknown as ServerTimeResponse;
      this.clock.addSample(
        sentAt,
        receivedAt,
        result.epoch_ms,
      );

      await new Promise((resolve) =>
        window.setTimeout(resolve, 80),
      );
    }
  }

  schedule(
    serverEpochMs: number,
    callback: () => void,
  ): () => void {
    const timeoutId = window.setTimeout(
      callback,
      this.clock.delayUntil(serverEpochMs),
    );

    return () => window.clearTimeout(timeoutId);
  }

  calculateRecordingOffsetMs(input: {
    youtubeTimeAtRecorderStartSeconds: number;
  }): number {
    return Math.round(
      input.youtubeTimeAtRecorderStartSeconds * 1_000,
    );
  }
}

export const synchronizationService =
  new SynchronizationService();
