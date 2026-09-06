import type { LoadedVoiceTrack } from '../../services/AudioService';

function writeAscii(
  view: DataView,
  offset: number,
  value: string,
): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(
      offset + index,
      value.charCodeAt(index),
    );
  }
}

function audioBufferToWav(
  buffer: AudioBuffer,
): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frameCount = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize =
    frameCount * channels * bytesPerSample;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(
    28,
    sampleRate * blockAlign,
    true,
  );
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = Array.from(
    { length: channels },
    (_, channel) => buffer.getChannelData(channel),
  );

  let offset = 44;

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (
      let channel = 0;
      channel < channels;
      channel += 1
    ) {
      const sample = Math.max(
        -1,
        Math.min(
          1,
          channelData[channel]?.[frame] ?? 0,
        ),
      );

      view.setInt16(
        offset,
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff,
        true,
      );

      offset += bytesPerSample;
    }
  }

  return new Blob([arrayBuffer], {
    type: 'audio/wav',
  });
}

export async function exportVoiceMixToWav(input: {
  tracks: LoadedVoiceTrack[];
  volumes: Record<string, number>;
  durationSeconds: number;
}): Promise<Blob> {
  const sampleRate = 48_000;
  const durationSeconds = Math.max(
    1,
    input.durationSeconds,
  );
  const frameCount = Math.ceil(
    durationSeconds * sampleRate,
  );

  const context = new OfflineAudioContext(
    2,
    frameCount,
    sampleRate,
  );

  for (const track of input.tracks) {
    const source = context.createBufferSource();
    const gain = context.createGain();

    source.buffer = track.buffer;
    gain.gain.value =
      input.volumes[track.recording.playerId] ?? 1;

    source.connect(gain);
    gain.connect(context.destination);

    const startSeconds = Math.max(
      0,
      track.recording.startOffsetMs / 1_000,
    );

    source.start(startSeconds);
  }

  const rendered = await context.startRendering();
  return audioBufferToWav(rendered);
}

export function downloadBlob(
  blob: Blob,
  filename: string,
): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1_000);
}
