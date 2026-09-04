export interface BrowserCapabilities {
  getUserMedia: boolean;
  mediaRecorder: boolean;
  audioContext: boolean;
  offlineAudioContext: boolean;
  webSocket: boolean;
  localStorage: boolean;
}

export function detectCapabilities(): BrowserCapabilities {
  return {
    getUserMedia: Boolean(
      navigator.mediaDevices?.getUserMedia,
    ),
    mediaRecorder: 'MediaRecorder' in window,
    audioContext: Boolean(
      window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext,
    ),
    offlineAudioContext: 'OfflineAudioContext' in window,
    webSocket: 'WebSocket' in window,
    localStorage: (() => {
      try {
        const key = '__dubmania_test__';
        localStorage.setItem(key, '1');
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    })(),
  };
}
