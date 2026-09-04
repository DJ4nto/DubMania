import { AUDIO_BITS_PER_SECOND } from '../config/constants';
import { selectRecordingMimeType } from '../lib/audio/mime';

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  startedAtPerformanceMs: number;
  stoppedAtPerformanceMs: number;
  durationMs: number;
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
          "Ce navigateur ne prend pas en charge l'enregistrement audio.",
        ),
      );
    }

    const mimeType = selectRecordingMimeType();
    this.chunks = [];

    this.recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    });

    this.recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    });

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
              "Le navigateur n'a pas pu démarrer l'enregistrement.",
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
        new Error("Aucun enregistrement n'est en cours."),
      );
    }

    return new Promise((resolve, reject) => {
      recorder.addEventListener(
        'stop',
        () => {
          const stoppedAt = performance.now();
          const mimeType =
            recorder.mimeType || this.chunks[0]?.type || 'audio/webm';
          const blob = new Blob(this.chunks, { type: mimeType });

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
        () => reject(new Error("L'enregistrement a échoué.")),
        { once: true },
      );

      recorder.stop();
    });
  }

  abort(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }

    this.recorder = null;
    this.chunks = [];
  }
}
