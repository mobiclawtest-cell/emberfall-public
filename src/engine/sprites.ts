// Runtime pixel-art generation. All art is drawn in code — no external assets.
import { RNG, hash2 } from './rng';
import { shade, mix } from './utils';

export type Px = (string | null)[][];
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
export function pxFromStrings(rows: string[], palette: Record<string, string>): Px {
  return rows.map(r => r.split('').map(ch => palette[ch] ?? null));
}
export function pxToCanvas(px: Px, scale = 1): HTMLCanvasElement {
  const h = px.length, w = px[0].length;
  const c = makeCanvas(w * scale, h * scale);
  const g = c.getContext('2d')!;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const col = px[y][x];
    if (col) { g.fillStyle = col; g.fillRect(x * scale, y * scale, scale, scale); }
  }
  return c;
}
export function flipPx(px: Px): Px { return px.map(r => [...r].reverse()); }
// Draw a pixel map onto a context
export function drawPx(g: CanvasRenderingContext2D, px: Px, x: number, y: number, scale = 1, flip = false) {
  const h = px.length, w = px[0].length;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const col = px[j][i];
    if (col) { g.fillStyle = col; const dx = flip ? (w - 1 - i) : i; g.fillRect(x + dx * scale, y + j * scale, scale, scale); }
  }
}

// ---------- Procedural creature sprite (enemy genome renderer) ----------
export interface Genome {
  body: number; // 0 blob,1 quadruped,2 biped,3 winged,4 serpent,5 floating,6 insectoid,7 golem,8 plant,9 spirit
  primary: string; secondary: string; eye: string;
  size: number; // px radius-ish
  eyes: number; horns: number; spikes: number; tail: boolean; legs: number;
  glow: boolean; seed: number;
}
const spriteCache = new Map<string, HTMLCanvasElement[]>();
export function genomeSprite(g: Genome, frame: number): HTMLCanvasElement {
  const key = `${g.body}|${g.primary}|${g.secondary}|${g.size}|${g.eyes}|${g.horns}|${g.spikes}|${g.tail?1:0}|${g.legs}|${g.glow?1:0}|${g.seed}|${frame}`;
  // cache per creature all 4 frames
  const ck = key.slice(0, key.lastIndexOf('|'));
  let frames = spriteCache.get(ck);
  if (!frames) {
    frames = [0, 1, 2, 3].map(f => renderGenome(g, f));
    if (spriteCache.size > 600) spriteCache.clear();
    spriteCache.set(ck, frames);
  }
  return frames[frame & 3];
}
function renderGenome(g: Genome, frame: number): HTMLCanvasElement {
  const S = 16;
  const c = makeCanvas(S, S); const x = c.getContext('2d')!;
  const rng = new RNG(g.seed + frame * 7);
  const p = g.primary, s = g.secondary, pd = shade(p, -30), pl = shade(p, 25);
  const bob = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const cx = 8, cy = 8 + bob;
  const r = g.size;
  const P = (px: number, py: number, col: string) => { x.fillStyle = col; x.fillRect(Math.round(px), Math.round(py), 1, 1); };
  const blob = (ccx: number, ccy: number, rr: number, col: string, col2?: string) => {
    for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) {
      if (i * i + j * j <= rr * rr + 0.5) {
        const edge = i * i + j * j > (rr - 1.2) * (rr - 1.2);
        P(ccx + i, ccy + j, edge ? pd : (col2 && hash2(ccx + i + frame, ccy + j, g.seed) > 0.75 ? col2 : col));
      }
    }
  };
  switch (g.body) {
    case 0: { // blob
      const sq = frame === 2 ? 1 : 0;
      blob(cx, cy + sq, r - sq, p, pl);
      blob(cx, cy + sq, Math.max(1, r - 2 - sq), p);
      break;
    }
    case 1: { // quadruped
      blob(cx, cy - 1, r - 1, p, pl); // torso
      blob(cx + r - 2, cy - r + 2, Math.max(2, Math.floor(r / 2)), p); // head
      const lo = frame % 2 === 0 ? 1 : 0;
      for (const lx of [-r + 2, -1, 1, r - 3]) { P(cx + lx, cy + r - 1 + (lx % 2 ? lo : 1 - lo), pd); P(cx + lx, cy + r + (lx % 2 ? lo : 1 - lo), pd); }
      break;
    }
    case 2: { // biped
      blob(cx, cy - 2, r - 2, p, pl); // torso
      blob(cx, cy - r - 1, Math.max(2, Math.floor(r / 2)), p); // head
      const lo = frame % 2 === 0 ? 1 : 0;
      P(cx - 2, cy + r - 2 + lo, pd); P(cx + 1, cy + r - 2 + (1 - lo), pd);
      P(cx - 2, cy + r - 1 + lo, pd); P(cx + 1, cy + r - 1 + (1 - lo), pd);
      P(cx - r, cy - 2, pd); P(cx + r - 1, cy - 2, pd); // arms
      break;
    }
    case 3: { // winged
      const wob = frame % 2 === 0 ? -2 : 0;
      blob(cx, cy, r - 2, p, pl);
      for (let i = 1; i <= r; i++) { P(cx - r - 1 + i * 0, cy - 3 + wob - (i % 2), s); P(cx + r, cy - 3 + wob - (i % 2), s); }
      for (let i = 0; i < 3; i++) { P(cx - r - 1, cy - 2 + wob + i, s); P(cx + r, cy - 2 + wob + i, s); P(cx - r, cy - 4 + wob + i, s); P(cx + r - 1, cy - 4 + wob + i, s); }
      break;
    }
    case 4: { // serpent
      for (let i = 0; i < 4; i++) {
        const seg = Math.sin((frame / 4) * Math.PI * 2 + i * 1.1) * 1.5;
        blob(cx + Math.round(seg) - (3 - i) * 0, cy + i * 2 - 4, Math.max(1, r - 2 - (i > 1 ? 1 : 0)), i === 0 ? pl : p);
      }
      break;
    }
    case 5: { // floating
      blob(cx, cy - 2, r - 1, p, pl);
      if (g.glow) { P(cx - r, cy + 2, s); P(cx + r - 1, cy + 3, s); P(cx, cy + r, s); }
      P(cx - 1, cy + r, s); P(cx + 1, cy + r + 1, s);
      break;
    }
    case 6: { // insectoid
      blob(cx, cy, r - 2, p, pl);
      blob(cx, cy - r + 1, 2, pd);
      const lo = frame % 2;
      for (let i = 0; i < 3; i++) { P(cx - r, cy - 1 + i * 2 + lo * (i % 2), pd); P(cx + r - 1, cy - 1 + i * 2 + (1 - lo) * (i % 2), pd); }
      P(cx - 2, cy - r - 1, s); P(cx + 1, cy - r - 1, s); // antennae
      break;
    }
    case 7: { // golem
      blob(cx, cy - 1, r - 1, p, pl);
      blob(cx, cy - r, Math.max(2, Math.floor(r / 2) - 0), pd);
      P(cx - r, cy, pd); P(cx + r - 1, cy, pd); P(cx - r, cy + 1, pd); P(cx + r - 1, cy + 1, pd);
      P(cx - 2, cy + r, pd); P(cx + 1, cy + r, pd);
      break;
    }
    case 8: { // plant
      blob(cx, cy + 1, r - 2, p, pl);
      P(cx, cy - r, s); P(cx - 1, cy - r + 1, s); P(cx + 1, cy - r + 1, s);
      blob(cx, cy - r + 2, 2, g.secondary);
      break;
    }
    default: { // spirit
      blob(cx, cy - 1, r - 1, p, pl);
      for (let i = 0; i < 3; i++) P(cx - 2 + i * 2, cy + r + ((frame + i) % 2), p);
      break;
    }
  }
  // horns
  for (let h = 0; h < g.horns; h++) {
    const hx = cx - 3 + h * 4;
    P(hx, cy - r - 2, s); P(hx, cy - r - 3, s);
  }
  // spikes
  for (let sp = 0; sp < g.spikes; sp++) {
    const ang = rng.range(0, Math.PI * 2);
    const sx = cx + Math.round(Math.cos(ang) * r), sy = cy + Math.round(Math.sin(ang) * r);
    P(sx, sy, pd);
  }
  // eyes
  const eyeY = cy - (g.body === 1 ? r - 2 : g.body === 2 ? r + 1 : 2);
  const eyeX = g.body === 1 ? cx + r - 2 : cx;
  for (let e = 0; e < g.eyes; e++) {
    const off = (e - (g.eyes - 1) / 2) * 3;
    P(eyeX + off, eyeY, g.eye);
    if (g.glow) P(eyeX + off, eyeY, '#ffffff');
  }
  return c;
}

// ---------- Player sprite ----------
export function playerSprite(dir: number, frame: number, opts: { skin: string; tunic: string; hair: string; hat: string | null; swordTrail: string | null }): HTMLCanvasElement {
  const c = makeCanvas(16, 16); const x = c.getContext('2d')!;
  const { skin, tunic, hair, hat } = opts;
  const P = (px: number, py: number, col: string) => { x.fillStyle = col; x.fillRect(px, py, 1, 1); };
  const walk = frame % 2 === 0 ? 1 : 0;
  const td = shade(tunic, -35), sd = shade(skin, -25);
  if (dir === 2) { // up (back)
    for (let j = 3; j < 8; j++) for (let i = 5; i <= 10; i++) P(i, j, hair);
    for (let j = 8; j < 12; j++) for (let i = 5; i <= 10; i++) P(i, j, j > 10 ? td : tunic);
  } else if (dir === 1 || dir === 3) { // side
    const f = dir === 3 ? (i: number) => 15 - i : (i: number) => i;
    for (let j = 3; j < 8; j++) for (let i = 5; i <= 10; i++) P(f(i), j, j === 3 ? hair : skin);
    P(f(9), 5, '#1a1a22'); // eye
    for (let j = 8; j < 12; j++) for (let i = 5; i <= 10; i++) P(f(i), j, j > 10 ? td : tunic);
  } else { // down (front)
    for (let j = 3; j < 8; j++) for (let i = 5; i <= 10; i++) P(i, j, j === 3 ? hair : skin);
    P(6, 5, '#1a1a22'); P(9, 5, '#1a1a22');
    P(7, 7, sd); P(8, 7, sd);
    for (let j = 8; j < 12; j++) for (let i = 5; i <= 10; i++) P(i, j, j > 10 ? td : tunic);
  }
  // arms
  P(4, 8 + walk, skin); P(11, 9 - walk, skin);
  // legs
  P(6, 12 + walk, '#3a2f28'); P(9, 13 - walk, '#3a2f28');
  P(6, 13 + walk, '#241d18'); P(9, 14 - walk, '#241d18');
  if (hat === 'hood') { for (let j = 2; j < 6; j++) for (let i = 4; i <= 11; i++) if (j === 2 || i === 4 || i === 11) P(i, j, '#5a3d8f'); }
  else if (hat === 'crown') { P(5, 2, '#ffd23f'); P(7, 1, '#ffd23f'); P(9, 1, '#ffd23f'); P(10, 2, '#ffd23f'); for (let i = 5; i <= 10; i++) P(i, 3, '#ffd23f'); }
  else if (hat === 'horn') { P(4, 2, '#e8e0d0'); P(11, 2, '#e8e0d0'); P(5, 3, '#7a4a2b'); P(10, 3, '#7a4a2b'); for (let i = 5; i <= 10; i++) P(i, 4, '#7a4a2b'); }
  return c;
}
// ---------- Cinder companion ----------
export function cinderSprite(frame: number, tint: string): HTMLCanvasElement {
  const c = makeCanvas(8, 8); const x = c.getContext('2d')!;
  const bob = [0, -1, 0, 1][frame & 3];
  const core = '#fff3c4', mid = tint, dark = shade(tint, -40);
  const rows = [
    [null, null, mid, mid, null, null],
    [null, mid, core, core, mid, null],
    [mid, core, core, core, core, mid],
    [mid, core, core, core, core, mid],
    [null, mid, core, core, mid, null],
    [null, dark, mid, mid, dark, null],
  ];
  rows.forEach((r, j) => r.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i + 1, j + 1 + bob, 1, 1); } }));
  if (frame % 4 === 3) { x.fillStyle = mid; x.fillRect(0, 6 + bob, 1, 1); x.fillRect(7, 6 + bob, 1, 1); }
  return c;
}
// ---------- Item icons (16x16 generated) ----------
const iconCache = new Map<string, HTMLCanvasElement>();
export function itemIcon(kind: string, color: string, accent: string, seed: number): HTMLCanvasElement {
  const key = `${kind}|${color}|${accent}|${seed % 8}`;
  const hitC = iconCache.get(key); if (hitC) return hitC;
  const c = makeCanvas(16, 16); const x = c.getContext('2d')!;
  const rng = new RNG(seed);
  const P = (px: number, py: number, col: string) => { if (px >= 0 && px < 16 && py >= 0 && py < 16) { x.fillStyle = col; x.fillRect(px, py, 1, 1); } };
  const d = shade(color, -40), l = shade(color, 40);
  switch (kind) {
    case 'sword': {
      for (let i = 0; i < 9; i++) { P(4 + i, 11 - i, i % 2 ? color : l); P(5 + i, 11 - i, d); }
      P(3, 12, accent); P(4, 13, accent); P(3, 13, accent); P(2, 13, accent); P(3, 14, '#6b4a2f'); P(4, 14, '#6b4a2f'); P(2, 15, accent);
      break;
    }
    case 'axe': { for (let i = 0; i < 8; i++) P(6 + Math.floor(i / 3), 4 + i, '#6b4a2f'); for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) P(7 + i, 2 + j, i === 3 ? l : color); break; }
    case 'bow': { for (let i = 0; i < 11; i++) { const a = (i / 10 - 0.5) * 2.2; P(8 + Math.round(Math.sin(a) * 5), 3 + i, color); } P(8, 3, accent); P(8, 8, accent); P(8, 13, accent); for (let i = 4; i < 13; i++) P(8, i, accent); break; }
    case 'shield': { for (let j = 2; j < 12; j++) for (let i = 4; i <= 11; i++) { const edge = i === 4 || i === 11 || j === 2; P(i, j, edge ? accent : (j > 9 && (i < 6 || i > 9)) ? 'rgba(0,0,0,0)' : color); } for (let i = 5; i <= 10; i++) P(i, 11, d); P(7, 5, l); P(8, 5, l); break; }
    case 'armor': { for (let j = 3; j < 13; j++) for (let i = 4; i <= 11; i++) P(i, j, (i === 4 || i === 11) && j < 6 ? 'rgba(0,0,0,0)' : color); for (let i = 6; i <= 9; i++) P(i, 3, accent); P(7, 7, d); P(8, 7, d); break; }
    case 'boots': { for (let j = 4; j < 11; j++) { P(5, j, color); P(10, j, color); } for (let i = 4; i <= 7; i++) P(i, 11, d); for (let i = 9; i <= 12; i++) P(i, 11, d); P(4, 12, d); P(5, 12, d); P(10, 12, d); P(11, 12, d); P(12, 11, d); break; }
    case 'ring': { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; P(8 + Math.round(Math.cos(a) * 4), 8 + Math.round(Math.sin(a) * 4), color); } P(8, 3, accent); P(8, 2, l); break; }
    case 'amulet': { for (let i = 4; i <= 11; i++) { P(i, 3 + Math.abs(8 - i) % 2, accent); } for (let j = 6; j < 11; j++) for (let i = 6; i <= 9; i++) P(i, j, color); P(7, 7, l); break; }
    case 'potion': { for (let j = 7; j < 13; j++) for (let i = 5; i <= 10; i++) P(i, j, color); for (let j = 5; j < 7; j++) for (let i = 6; i <= 9; i++) P(i, j, '#c8b89a'); P(7, 4, accent); P(8, 4, accent); P(6, 9, l); break; }
    case 'food': { for (let j = 5; j < 11; j++) for (let i = 4; i <= 10; i++) if ((i - 7) * (i - 7) / 9 + (j - 8) * (j - 8) / 8 < 1) P(i, j, color); P(7, 3, '#3f7a3a'); P(8, 4, '#6b4a2f'); break; }
    case 'scroll': { for (let j = 3; j < 13; j++) for (let i = 4; i <= 11; i++) P(i, j, j % 3 === 0 && i > 5 && i < 10 ? d : color); for (let i = 4; i <= 11; i++) { P(i, 3, accent); P(i, 12, accent); } break; }
    case 'gem': { const pts: [number, number][] = [[8, 2], [11, 5], [12, 8], [8, 13], [4, 8], [5, 5]]; for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { let inside = false; for (let k = 0; k < pts.length; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % pts.length]; if ((y1 > j) !== (y2 > j) && i < (x2 - x1) * (j - y1) / (y2 - y1) + x1) inside = !inside; } if (inside) P(i, j, hash2(i, j, seed) > 0.7 ? l : color); } P(6, 5, '#ffffff'); break; }
    case 'material': { for (let j = 6; j < 12; j++) for (let i = 4; i <= 11; i++) if (rng.next() > 0.15) P(i, j, hash2(i, j, seed) > 0.6 ? l : color); break; }
    case 'tool': { for (let i = 0; i < 9; i++) P(5 + Math.floor(i / 2), 5 + i, '#6b4a2f'); for (let i = 0; i < 5; i++) P(4 + i, 3 + i % 2, color); break; }
    case 'key': { P(5, 4, color); P(6, 3, color); P(7, 3, color); P(8, 4, color); P(6, 5, color); P(7, 5, color); for (let i = 0; i < 7; i++) P(6, 6 + i, color); P(8, 10, color); P(8, 12, color); break; }
    case 'bomb': { for (let j = 6; j < 13; j++) for (let i = 4; i <= 11; i++) if ((i - 7.5) * (i - 7.5) + (j - 9.5) * (j - 9.5) < 15) P(i, j, color); P(8, 4, accent); P(9, 3, '#ffd23f'); P(6, 8, l); break; }
    case 'fish': { for (let i = 3; i < 10; i++) { P(i, 8, color); P(i, 7 + (i % 3 === 0 ? 1 : 0), color); P(i, 9 - (i % 3 === 0 ? 1 : 0), color); } P(10, 7, accent); P(11, 6, accent); P(11, 10, accent); P(10, 9, accent); P(4, 7, '#fff'); break; }
    case 'relic': { for (let j = 3; j < 13; j++) for (let i = 5; i <= 10; i++) if (Math.abs(8 - i) + Math.abs(8 - j) < 5) P(i, j, hash2(i, j, seed) > 0.5 ? color : accent); P(8, 8, '#ffffff'); break; }
    case 'card': { for (let j = 2; j < 14; j++) for (let i = 4; i <= 11; i++) P(i, j, (i === 4 || i === 11 || j === 2 || j === 13) ? accent : color); P(8, 8, l); P(7, 7, l); P(9, 9, l); break; }
    case 'block': { for (let j = 4; j < 12; j++) for (let i = 4; i < 12; i++) P(i, j, (i === 4 || j === 4) ? l : (i === 11 || j === 11) ? d : color); break; }
    case 'seed': { P(8, 4, '#3f7a3a'); P(7, 5, '#3f7a3a'); P(9, 5, '#3f7a3a'); for (let j = 7; j < 12; j++) for (let i = 6; i <= 9; i++) P(i, j, color); break; }
    default: { for (let j = 4; j < 12; j++) for (let i = 4; i < 12; i++) P(i, j, hash2(i, j, seed) > 0.5 ? color : d); }
  }
  if (iconCache.size > 800) iconCache.clear();
  iconCache.set(key, c);
  return c;
}
// ---------- Pixel font (3x5) drawn in code ----------
const FONT: Record<string, string[]> = {
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'], '2': ['111','001','111','100','111'],
  '3': ['111','001','111','001','111'], '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'], '7': ['111','001','010','010','010'], '8': ['111','101','111','101','111'],
  '9': ['111','101','111','001','111'],
  'A': ['010','101','111','101','101'], 'B': ['110','101','110','101','110'], 'C': ['011','100','100','100','011'],
  'D': ['110','101','101','101','110'], 'E': ['111','100','110','100','111'], 'F': ['111','100','110','100','100'],
  'G': ['011','100','101','101','011'], 'H': ['101','101','111','101','101'], 'I': ['111','010','010','010','111'],
  'J': ['001','001','001','101','010'], 'K': ['101','101','110','101','101'], 'L': ['100','100','100','100','111'],
  'M': ['101','111','111','101','101'], 'N': ['101','111','111','111','101'], 'O': ['010','101','101','101','010'],
  'P': ['110','101','110','100','100'], 'Q': ['010','101','101','110','011'], 'R': ['110','101','110','101','101'],
  'S': ['011','100','010','001','110'], 'T': ['111','010','010','010','010'], 'U': ['101','101','101','101','111'],
  'V': ['101','101','101','101','010'], 'W': ['101','101','111','111','101'], 'X': ['101','101','010','101','101'],
  'Y': ['101','101','010','010','010'], 'Z': ['111','001','010','100','111'],
  '.': ['000','000','000','000','010'], ',': ['000','000','000','010','100'], '!': ['010','010','010','000','010'],
  '?': ['111','001','011','000','010'], ':': ['000','010','000','010','000'], '-': ['000','000','111','000','000'],
  '+': ['000','010','111','010','000'], '/': ['001','001','010','100','100'], "'": ['010','010','000','000','000'],
  '(': ['001','010','010','010','001'], ')': ['100','010','010','010','100'], '<': ['001','010','100','010','001'],
  '>': ['100','010','001','010','100'], '%': ['101','001','010','100','101'], '*': ['101','010','111','010','101'],
  '#': ['101','111','101','111','101'], '$': ['011','110','010','011','110'], '"': ['101','101','000','000','000'],
  '_': ['000','000','000','000','111'], '=': ['000','111','000','111','000'], '|': ['010','010','010','010','010'],
  '~': ['000','000','011','110','000'], '^': ['010','101','000','000','000'], ';': ['000','010','000','010','100'],
  '[': ['011','010','010','010','011'], ']': ['110','010','010','010','110'], '{': ['001','010','110','010','001'],
  '}': ['100','010','011','010','100'], '@': ['011','101','101','100','011'], '&': ['010','101','010','101','011'],
};
export function pixelText(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1) {
  g.fillStyle = color;
  let cx = x;
  const up = text.toUpperCase();
  for (const ch of up) {
    if (ch === ' ') { cx += 4 * scale; continue; }
    const gl = FONT[ch];
    if (!gl) { cx += 4 * scale; continue; }
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (gl[j][i] === '1') g.fillRect(cx + i * scale, y + j * scale, scale, scale);
    cx += 4 * scale;
  }
}
export function pixelTextWidth(text: string, scale = 1): number { return text.length * 4 * scale; }
export function mixColors(a: string, b: string, t: number) { return mix(a, b, t); }
