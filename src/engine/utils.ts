export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);
export const dist2 = (x1: number, y1: number, x2: number, y2: number) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
export const angleTo = (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1);
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
export function aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
export function hit(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const r = ar + br; return dist2(ax, ay, bx, by) < r * r;
}
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
export function mix(hexA: string, hexB: string, t: number): string {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
