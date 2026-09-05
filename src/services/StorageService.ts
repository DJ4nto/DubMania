import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/errors/mapError';

const RECORDINGS_BUCKET = 'recordings';

export class StorageService {
  async uploadRecording(
    path: string,
    blob: Blob,
  ): Promise<void> {
    const { error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(path, blob, {
        contentType:
          blob.type || 'application/octet-stream',
        cacheControl: '60',
        upsert: true,
      });

    if (error) {
      throw mapSupabaseError(error);
    }
  }

  async downloadRecording(
    path: string,
  ): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .download(path);

    if (error) {
      throw mapSupabaseError(error);
    }

    return data;
  }

  async deleteRecordings(
    paths: string[],
  ): Promise<void> {
    if (paths.length === 0) return;

    const { error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .remove(paths);

    if (error) {
      throw mapSupabaseError(error);
    }
  }
}

export const storageService = new StorageService();
