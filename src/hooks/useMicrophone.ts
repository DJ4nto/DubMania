import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  microphoneService,
  type MicrophoneDevice,
} from '../services/MicrophoneService';
import { playerService } from '../services/PlayerService';
import { AppError } from '../lib/errors/AppError';
import type { MicrophoneState } from '../types/game';

interface UseMicrophoneResult {
  microphoneState: MicrophoneState;
  level: number;
  testing: boolean;
  devices: MicrophoneDevice[];
  selectedDeviceId: string;
  error: string | null;
  startTest: () => Promise<void>;
  stopTest: () => void;
  selectDevice: (deviceId: string) => Promise<void>;
}

export function useMicrophone(
  playerId: string | null,
  initialState: MicrophoneState,
): UseMicrophoneResult {
  const [microphoneState, setMicrophoneState] =
    useState<MicrophoneState>(initialState);
  const [level, setLevel] = useState(0);
  const [testing, setTesting] = useState(false);
  const [devices, setDevices] = useState<
    MicrophoneDevice[]
  >([]);
  const [selectedDeviceId, setSelectedDeviceId] =
    useState('');
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef =
    useRef<AudioContext | null>(null);
  const analyserRef =
    useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const persistState = useCallback(
    async (state: MicrophoneState) => {
      if (!playerId) return;

      try {
        await playerService.updateMicrophoneState(
          playerId,
          state,
        );
      } catch (persistError) {
        console.warn(
          '[DubMania] État du microphone non synchronisé :',
          persistError,
        );
      }
    },
    [playerId],
  );

  const stopTest = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(
        animationFrameRef.current,
      );
      animationFrameRef.current = null;
    }

    analyserRef.current?.disconnect();
    analyserRef.current = null;

    microphoneService.stopStream(streamRef.current);
    streamRef.current = null;

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setTesting(false);
    setLevel(0);
  }, []);

  const runMeter = useCallback(
    (analyser: AnalyserNode) => {
      const values = new Uint8Array(
        analyser.fftSize,
      );

      function update(): void {
        analyser.getByteTimeDomainData(values);

        let sum = 0;

        for (const value of values) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const rms = Math.sqrt(sum / values.length);
        const visualLevel = Math.min(
          1,
          Math.max(0, rms * 4.5),
        );

        setLevel(visualLevel);

        animationFrameRef.current =
          window.requestAnimationFrame(update);
      }

      update();
    },
    [],
  );

  const startWithDevice = useCallback(
    async (deviceId?: string) => {
      stopTest();
      setError(null);
      setTesting(true);

      try {
        const stream =
          await microphoneService.requestStream(deviceId);

        streamRef.current = stream;

        const AudioContextConstructor =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextConstructor) {
          throw new AppError(
            'UNSUPPORTED_BROWSER',
            'Le vumètre audio n’est pas disponible dans ce navigateur.',
          );
        }

        const audioContext =
          new AudioContextConstructor();

        audioContextRef.current = audioContext;

        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const source =
          audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.78;

        source.connect(analyser);
        analyserRef.current = analyser;

        const availableDevices =
          await microphoneService.listDevices();

        setDevices(availableDevices);

        const activeTrack = stream.getAudioTracks()[0];
        const settings = activeTrack?.getSettings();

        if (settings?.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }

        setMicrophoneState('AVAILABLE');
        await persistState('AVAILABLE');
        runMeter(analyser);
      } catch (caughtError) {
        stopTest();

        if (caughtError instanceof AppError) {
          setError(caughtError.message);

          if (
            caughtError.code === 'MICROPHONE_DENIED'
          ) {
            setMicrophoneState('DENIED');
            await persistState('DENIED');
          } else {
            setMicrophoneState('UNAVAILABLE');
            await persistState('UNAVAILABLE');
          }

          return;
        }

        setError(
          'Une erreur inattendue empêche le test du microphone.',
        );
        setMicrophoneState('UNAVAILABLE');
        await persistState('UNAVAILABLE');
      }
    },
    [persistState, runMeter, stopTest],
  );

  const startTest = useCallback(async () => {
    await startWithDevice(
      selectedDeviceId || undefined,
    );
  }, [selectedDeviceId, startWithDevice]);

  const selectDevice = useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      await startWithDevice(deviceId);
    },
    [startWithDevice],
  );

  useEffect(() => {
    setMicrophoneState(initialState);
  }, [initialState]);

  useEffect(() => stopTest, [stopTest]);

  return {
    microphoneState,
    level,
    testing,
    devices,
    selectedDeviceId,
    error,
    startTest,
    stopTest,
    selectDevice,
  };
}
