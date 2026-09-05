import { AUDIO_BITS_PER_SECOND } from '../config/constants';
import {
  extensionForMimeType,
  selectRecordingMimeType,
} from '../lib/audio/mime';
import { supabase } from '../lib/supabase';
import { lobbySnapshotSchema } from '../lib/lobbySchema';
import { mapSupabaseError } from '../lib/errors/mapError';
import { storageService } from './StorageService';
import type { LobbySnapshot } from '../types/lobby';

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  startedAtPerformanceMs: number;
  stoppedAtPerformanceMs: number;
  durationMs: number;
}

export interface RegisterRecordingInput {
  lobbyId: string;
  roundId: string;
  playerId: string;
  attempt: 1 | 2;
  recording: RecordingResult;
  startOffsetMs: number;
  endOffsetMs: number;
}

export interface RegisteredRecording {
  recordingId: string;
  snapshot: LobbySnapshot;
  storagePath: string;
}

interface RegisterRecordingResponse {
  recordingId: string;
  snapshot: unknown;
}

export class RecordingService {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  start(stream: MediaStream): Promise<void> {
    if (this.recorder?.state === 'recording') {
      return Promise.reject(
        new Error('Un enregistrement est déjà en cours.'),
      );
    }

    if (typeof MediaRecorder === 'undefined') {
      return Promise.reject(
        new Error(
          'Ce navigateur ne prend pas en charge l’enregistrement audio.',
        ),
      );
    }

    const mimeType = selectRecordingMimeType();
    this.chunks = [];

    this.recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });

    this.recorder.addEventListener(
      'dataavailable',
      (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      },
    );

    return new Promise((resolve, reject) => {
      const recorder = this.recorder;

      if (!recorder) {
        reject(new Error('Enregistreur indisponible.'));
        return;
      }

      recorder.addEventListener(
        'start',
        () => {
          this.startedAt = performance.now();
          resolve();
        },
        { once: true },
      );

      recorder.addEventListener(
        'error',
        () => {
          reject(
            new Error(
              'Le navigateur n’a pas pu démarrer l’enregistrement.',
            ),
          );
        },
        { once: true },
      );

      recorder.start(1_000);
    });
  }

  stop(): Promise<RecordingResult> {
    const recorder = this.recorder;

    if (!recorder || recorder.state === 'inactive') {
      return Promise.reject(
        new Error('Aucun enregistrement n’est en cours.'),
      );
    }

    return new Promise((resolve, reject) => {
      recorder.addEventListener(
        'stop',
        () => {
          const stoppedAt = performance.now();
          const mimeType =
            recorder.mimeType ||
            this.chunks[0]?.type ||
            'audio/webm';

          const blob = new Blob(this.chunks, {
            type: mimeType,
          });

          this.recorder = null;
          this.chunks = [];

          resolve({
            blob,
            mimeType,
            startedAtPerformanceMs: this.startedAt,
            stoppedAtPerformanceMs: stoppedAt,
            durationMs: stoppedAt - this.startedAt,
          });
        },
        { once: true },
      );

      recorder.addEventListener(
        'error',
        () => {
          reject(
            new Error('L’enregistrement a échoué.'),
          );
        },
        { once: true },
      );

      recorder.requestData();
      recorder.stop();
    });
  }

  get isRecording(): boolean {
    return this.recorder?.state === 'recording';
  }

  abort(): void {
    if (
      this.recorder &&
      this.recorder.state !== 'inactive'
    ) {
      this.recorder.stop();
    }

    this.recorder = null;
    this.chunks = [];
  }

  async uploadAndRegister(
    input: RegisterRecordingInput,
  ): Promise<RegisteredRecording> {
    const extension = extensionForMimeType(
      input.recording.mimeType,
    );

    const storagePath = [
      input.lobbyId,
      input.roundId,
      input.playerId,
      `attempt-${input.attempt}.${extension}`,
    ].join('/');

    await storageService.uploadRecording(
      storagePath,
      input.recording.blob,
    );

    const { data, error } = await supabase.rpc(
      'register_recording',
      {
        p_round_id: input.roundId,
        p_player_id: input.playerId,
        p_attempt: input.attempt,
        p_storage_path: storagePath,
        p_mime_type: input.recording.mimeType,
        p_size_bytes: input.recording.blob.size,
        p_duration_ms: Math.round(
          input.recording.durationMs,
        ),
        p_start_offset_ms: Math.round(
          input.startOffsetMs,
        ),
        p_end_offset_ms: Math.round(
          input.endOffsetMs,
        ),
      },
    );

    if (error) {
      try {
        await storageService.deleteRecordings([
          storagePath,
        ]);
      } catch {
        // La fonction de nettoyage générale supprimera
        // ultérieurement cet éventuel fichier orphelin.
      }

      throw mapSupabaseError(error);
    }

    const response =
      data as unknown as RegisterRecordingResponse;

    return {
      recordingId: response.recordingId,
      snapshot: lobbySnapshotSchema.parse(
        response.snapshot,
      ),
      storagePath,
    };
  }

  async validate(
    recordingId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'validate_recording',
      {
        p_recording_id: recordingId,
      },
    );

    if (error) throw mapSupabaseError(error);
    return lobbySnapshotSchema.parse(data);
  }

  async skip(
    playerId: string,
    roundId: string,
  ): Promise<LobbySnapshot> {
    const { data, error } = await supabase.rpc(
      'skip_player_recording',
      {
        p_player_id: playerId,
        p_round_id: roundId,
      },
    );

    if (error) throw mapSupabaseError(error);
    return lobbySnapshotSchema.parse(data);
  }
}

export const recordingService =
  new RecordingService();
