// Hash-based deterministic RNG + value noise. Safe far from origin (integer hashing).
export function hash2(x: number, y: number, seed: number): number {
  let h = (seed | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (x | 0), 0x85ebca6b);
  h = Math.imul(h ^ (y | 0), 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
export function hash3(x: number, y: number, z: number, seed: number): number {
  return hash2(x + Math.imul(z, 0x1f123bb5), y - Math.imul(z, 0x5f356495), seed);
}
export class RNG {
  private s: number;
  constructor(seed: number) { this.s = seed >>> 0 || 1; }
  next(): number {
    let s = this.s;
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    this.s = s >>> 0 || 1;
    return (this.s >>> 0) / 4294967296;
  }
  range(a: number, b: number): number { return a + this.next() * (b - a); }
  int(a: number, b: number): number { return Math.floor(this.range(a, b + 1)); }
  pick<T>(arr: readonly T[]): T { return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))]; }
  chance(p: number): boolean { return this.next() < p; }
  shuffle<T>(arr: T[]): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  fork(n: number): RNG { return new RNG((this.s ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0); }
}
export function seedFromString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function smooth(t: number): number { return t * t * (3 - 2 * t); }
export function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, seed: number, octaves: number, lac = 2, gain = 0.5): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + i * 101);
    norm += amp; amp *= gain; freq *= lac;
  }
  return sum / norm;
}
export function ridged(x: number, y: number, seed: number, octaves: number): number {
  let amp = 0.5, freq = 1, sum = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(valueNoise(x * freq, y * freq, seed + i * 77) * 2 - 1);
    sum += n * n * amp; amp *= 0.5; freq *= 2.1;
  }
  return sum;
}
