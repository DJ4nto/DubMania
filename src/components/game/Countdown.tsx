import type {
  CountdownValue,
} from '../../hooks/useSynchronizedCountdown';

interface CountdownProps {
  value: CountdownValue;
}

export function Countdown({
  value,
}: CountdownProps) {
  if (value === null) return null;

  return (
    <div
      className="countdown-overlay"
      role="status"
      aria-live="assertive"
    >
      <strong key={value}>{value}</strong>
    </div>
  );
}
