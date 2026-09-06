import { storageService } from './StorageService';
import type { RoundRecording } from '../types/recording';

export interface LoadedVoiceTrack {
  recording: RoundRecording;
  buffer: AudioBuffer;
}

export interface PlaybackVoiceTrack
  extends LoadedVoiceTrack {
  gain: GainNode;
  source: AudioBufferSourceNode;
}

export class AudioService {
  async loadTracks(
    context: AudioContext,
    recordings: RoundRecording[],
  ): Promise<LoadedVoiceTrack[]> {
    return Promise.all(
      recordings.map(async (recording) => {
        const blob =
          await storageService.downloadRecording(
            recording.storagePath,
          );

        const arrayBuffer = await blob.arrayBuffer();

        let buffer: AudioBuffer;

        try {
          buffer = await context.decodeAudioData(
            arrayBuffer.slice(0),
          );
        } catch (error) {
          throw new Error(
            `La piste audio ${recording.id} ne peut pas être décodée.`,
            { cause: error },
          );
        }

        return {
          recording,
          buffer,
        };
      }),
    );
  }

  scheduleTracks(input: {
    context: AudioContext;
    tracks: LoadedVoiceTrack[];
    videoPositionSeconds: number;
    startAtContextTime: number;
    volumes: Record<string, number>;
  }): PlaybackVoiceTrack[] {
    const {
      context,
      tracks,
      videoPositionSeconds,
      startAtContextTime,
      volumes,
    } = input;

    const playbackTracks: PlaybackVoiceTrack[] = [];

    for (const track of tracks) {
      const trackVideoOffsetSeconds =
        track.recording.startOffsetMs / 1_000;

      let sourceStartTime = startAtContextTime;
      let audioOffsetSeconds = 0;

      if (
        videoPositionSeconds >=
        trackVideoOffsetSeconds
      ) {
        audioOffsetSeconds =
          videoPositionSeconds -
          trackVideoOffsetSeconds;

        if (audioOffsetSeconds >= track.buffer.duration) {
          continue;
        }
      } else {
        sourceStartTime +=
          trackVideoOffsetSeconds -
          videoPositionSeconds;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();

      source.buffer = track.buffer;
      gain.gain.value =
        volumes[track.recording.playerId] ?? 1;

      source.connect(gain);
      gain.connect(context.destination);

      source.start(
        sourceStartTime,
        audioOffsetSeconds,
      );

      playbackTracks.push({
        ...track,
        gain,
        source,
      });
    }

    return playbackTracks;
  }

  stopTracks(
    tracks: PlaybackVoiceTrack[],
  ): void {
    for (const track of tracks) {
      try {
        track.source.stop();
      } catch {
        // La source peut déjà être terminée.
      }

      track.source.disconnect();
      track.gain.disconnect();
    }
  }
}

export const audioService = new AudioService();
