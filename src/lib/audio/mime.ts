const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
] as const;

export function selectRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  return MIME_CANDIDATES.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType),
  );
}

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'm4a';
  return 'webm';
}
