import { AppError } from '../lib/errors/AppError';

export interface MicrophoneDevice {
  deviceId: string;
  label: string;
}

export class MicrophoneService {
  async requestStream(
    deviceId?: string,
  ): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new AppError(
        'UNSUPPORTED_BROWSER',
        'Ce navigateur ne permet pas d’utiliser le microphone.',
      );
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId
            ? {
                deviceId: {
                  exact: deviceId,
                },
              }
            : {}),
          channelCount: {
            ideal: 1,
          },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (error) {
      if (error instanceof DOMException) {
        if (
          error.name === 'NotAllowedError' ||
          error.name === 'SecurityError'
        ) {
          throw new AppError(
            'MICROPHONE_DENIED',
            'L’accès au microphone a été refusé.',
            { cause: error },
          );
        }

        if (
          error.name === 'NotFoundError' ||
          error.name === 'DevicesNotFoundError'
        ) {
          throw new AppError(
            'MICROPHONE_UNAVAILABLE',
            'Aucun microphone n’a été détecté.',
            { cause: error },
          );
        }

        if (
          error.name === 'NotReadableError' ||
          error.name === 'TrackStartError'
        ) {
          throw new AppError(
            'MICROPHONE_IN_USE',
            'Le microphone est utilisé par une autre application.',
            { cause: error },
          );
        }

        if (error.name === 'OverconstrainedError') {
          throw new AppError(
            'MICROPHONE_UNAVAILABLE',
            'Le microphone sélectionné n’est plus disponible.',
            { cause: error },
          );
        }
      }

      throw new AppError(
        'MICROPHONE_UNAVAILABLE',
        'DubMania n’a pas pu démarrer le microphone.',
        { cause: error },
      );
    }
  }

  async listDevices(): Promise<MicrophoneDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    const devices =
      await navigator.mediaDevices.enumerateDevices();

    let microphoneNumber = 0;

    return devices
      .filter((device) => device.kind === 'audioinput')
      .map((device) => {
        microphoneNumber += 1;

        return {
          deviceId: device.deviceId,
          label:
            device.label ||
            `Microphone ${microphoneNumber}`,
        };
      });
  }

  stopStream(stream: MediaStream | null): void {
    stream?.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

export const microphoneService =
  new MicrophoneService();
