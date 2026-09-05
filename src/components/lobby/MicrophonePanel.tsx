import {
  AudioLines,
  Mic,
  MicOff,
  Square,
} from 'lucide-react';
import { useMicrophone } from '../../hooks/useMicrophone';
import type { MicrophoneState } from '../../types/game';

interface MicrophonePanelProps {
  playerId: string;
  initialState: MicrophoneState;
}

function getStatusLabel(
  state: MicrophoneState,
): string {
  switch (state) {
    case 'AVAILABLE':
      return 'Microphone détecté';
    case 'DENIED':
      return 'Accès au microphone refusé';
    case 'UNAVAILABLE':
      return 'Microphone indisponible';
    case 'UNKNOWN':
      return 'Microphone non testé';
  }
}

export function MicrophonePanel({
  playerId,
  initialState,
}: MicrophonePanelProps) {
  const microphone = useMicrophone(
    playerId,
    initialState,
  );

  const percentage = Math.round(
    microphone.level * 100,
  );

  const unavailable =
    microphone.microphoneState === 'DENIED' ||
    microphone.microphoneState === 'UNAVAILABLE';

  return (
    <section className="microphone-panel">
      <div className="section-heading">
        <h2>
          <Mic size={24} aria-hidden="true" />
          Microphone
        </h2>
      </div>

      <div
        className={[
          'microphone-status',
          microphone.microphoneState === 'AVAILABLE'
            ? 'microphone-status--available'
            : '',
          unavailable
            ? 'microphone-status--unavailable'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {unavailable ? (
          <MicOff size={22} aria-hidden="true" />
        ) : (
          <AudioLines size={22} aria-hidden="true" />
        )}

        <strong>
          {getStatusLabel(
            microphone.microphoneState,
          )}
        </strong>
      </div>

      <div className="microphone-meter">
        <div className="microphone-meter__heading">
          <span>Niveau</span>
          <span>{percentage}%</span>
        </div>

        <div
          className="microphone-meter__track"
          role="meter"
          aria-label="Niveau du microphone"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <div
            className="microphone-meter__value"
            style={{
              transform: `scaleX(${microphone.level})`,
            }}
          />
        </div>
      </div>

      {microphone.devices.length > 1 ? (
        <div className="field">
          <label
            className="field__label field__label--small"
            htmlFor="microphone-device"
          >
            Choisir un microphone
          </label>

          <select
            id="microphone-device"
            className="field__input"
            value={microphone.selectedDeviceId}
            onChange={(event) => {
              void microphone.selectDevice(
                event.target.value,
              );
            }}
          >
            {microphone.devices.map((device) => (
              <option
                key={device.deviceId}
                value={device.deviceId}
              >
                {device.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {microphone.error ? (
        <p className="microphone-error" role="alert">
          {microphone.error}
        </p>
      ) : null}

      {unavailable ? (
        <p className="microphone-warning">
          Ton microphone n’est pas activé. Tu ne
          pourras pas participer au doublage audio,
          mais la partie peut quand même commencer.
        </p>
      ) : null}

      <button
        className={[
          'button',
          'button--full',
          microphone.testing
            ? 'button--danger'
            : 'button--secondary',
        ].join(' ')}
        type="button"
        onClick={() => {
          if (microphone.testing) {
            microphone.stopTest();
          } else {
            void microphone.startTest();
          }
        }}
      >
        {microphone.testing ? (
          <>
            <Square size={18} aria-hidden="true" />
            Arrêter le test
          </>
        ) : (
          <>
            <Mic size={20} aria-hidden="true" />
            Tester mon microphone
          </>
        )}
      </button>
    </section>
  );
}
