export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    const normalized = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;
    this.state = normalized === 0 ? 0x6d2b79f5 : normalized;
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }

  range(minimum: number, maximum: number): number {
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
      return 0;
    }

    const low = Math.min(minimum, maximum);
    const high = Math.max(minimum, maximum);
    return low + (high - low) * this.next();
  }
}
