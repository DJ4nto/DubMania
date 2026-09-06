import { microphoneService } from './MicrophoneService';

class MicrophoneSessionService {
  private stream: MediaStream | null = null;

  async acquire(): Promise<MediaStream> {
    const activeTrack =
      this.stream?.getAudioTracks().find(
        (track) => track.readyState === 'live',
      );

    if (this.stream && activeTrack) {
      return this.stream;
    }

    this.release();
    this.stream =
      await microphoneService.requestStream();

    return this.stream;
  }

  async prepare(): Promise<void> {
    await this.acquire();
  }

  get current(): MediaStream | null {
    return this.stream;
  }

  release(): void {
    microphoneService.stopStream(this.stream);
    this.stream = null;
  }
}

export const microphoneSessionService =
  new MicrophoneSessionService();
