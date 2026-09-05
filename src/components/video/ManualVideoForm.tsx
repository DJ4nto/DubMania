import {
  useState,
  type FormEvent,
} from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { videoService } from '../../services/VideoService';
import type { SelectedVideo } from '../../types/video';

interface ManualVideoFormProps {
  onSelect: (video: SelectedVideo) => Promise<void>;
}

export function ManualVideoForm({
  onSelect,
}: ManualVideoFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const video = videoService.fromManualUrl(url);
      await onSelect(video);
      setUrl('');
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Le lien YouTube ne peut pas être utilisé.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="manual-video-form"
      onSubmit={handleSubmit}
    >
      <label
        className="field__label"
        htmlFor="youtube-url"
      >
        Utiliser un lien YouTube
      </label>

      <div className="manual-video-form__row">
        <input
          id="youtube-url"
          className="field__input"
          type="url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          placeholder="https://youtu.be/..."
          required
          disabled={submitting}
        />

        <button
          className="button button--primary button--compact"
          type="submit"
          disabled={submitting}
        >
          <LinkIcon size={18} aria-hidden="true" />
          {submitting ? 'Ajout…' : 'Utiliser'}
        </button>
      </div>

      {error ? (
        <p className="form-message" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
