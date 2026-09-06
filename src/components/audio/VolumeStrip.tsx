import type { CSSProperties } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VolumeStripProps {
  nickname: string;
  color: string;
  value: number;
  onChange: (value: number) => void;
}

export function VolumeStrip({
  nickname,
  color,
  value,
  onChange,
}: VolumeStripProps) {
  const percentage = Math.round(value * 100);

  return (
    <label
      className="volume-strip"
      style={
        {
          '--player-color': color,
        } as CSSProperties
      }
    >
      <span
        className="volume-strip__color"
        aria-hidden="true"
      />

      <strong>{nickname}</strong>

      {value === 0 ? (
        <VolumeX size={18} aria-hidden="true" />
      ) : (
        <Volume2 size={18} aria-hidden="true" />
      )}

      <input
        type="range"
        min="0"
        max="1.5"
        step="0.05"
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        aria-label={`Volume de ${nickname}`}
      />

      <span>{percentage}%</span>
    </label>
  );
}
