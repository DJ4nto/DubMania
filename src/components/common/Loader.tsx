interface LoaderProps {
  label?: string;
}

export function Loader({
  label = 'Chargement…',
}: LoaderProps) {
  return (
    <div
      className="loader-wrap"
      role="status"
      aria-live="polite"
    >
      <span className="loader" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
