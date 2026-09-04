interface ClockSample {
  offsetMs: number;
  roundTripMs: number;
}

export class ClockEstimator {
  private samples: ClockSample[] = [];
  private readonly maxSamples = 12;

  addSample(
    clientSentAtMs: number,
    clientReceivedAtMs: number,
    serverEpochMs: number,
  ): void {
    const roundTripMs =
      clientReceivedAtMs - clientSentAtMs;
    const midpointMs =
      clientSentAtMs + roundTripMs / 2;
    const offsetMs = serverEpochMs - midpointMs;

    this.samples.push({ offsetMs, roundTripMs });
    this.samples.sort(
      (left, right) => left.roundTripMs - right.roundTripMs,
    );
    this.samples = this.samples.slice(0, this.maxSamples);
  }

  get offsetMs(): number {
    if (this.samples.length === 0) return 0;

    const best = this.samples.slice(
      0,
      Math.max(3, Math.ceil(this.samples.length / 2)),
    );

    const offsets = best
      .map((sample) => sample.offsetMs)
      .sort((left, right) => left - right);

    return offsets[Math.floor(offsets.length / 2)] ?? 0;
  }

  serverNowMs(): number {
    return Date.now() + this.offsetMs;
  }

  delayUntil(serverEpochMs: number): number {
    return Math.max(0, serverEpochMs - this.serverNowMs());
  }
}
