// Pooled particle system: slash trails, sparks, dust, embers, snow, rain, damage numbers.
export interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
  color: string; size: number; grav: number; kind: number; // 0 sq,1 spark(line),2 text,3 circle
  text?: string; drag: number;
}
const POOL = 600;
export class Particles {
  arr: Particle[] = [];
  private freeList: number[] = [];
  constructor() {
    for (let i = 0; i < POOL; i++) {
      this.arr.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 1, grav: 0, kind: 0, drag: 1 });
      this.freeList.push(i);
    }
  }
  spawn(x: number, y: number, vx: number, vy: number, life: number, color: string, size = 1, grav = 0, kind = 0, text?: string, drag = 1) {
    let p: Particle;
    if (this.freeList.length) { p = this.arr[this.freeList.pop()!]; }
    else { p = this.arr[0]; } // recycle oldest-ish
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.maxLife = life;
    p.color = color; p.size = size; p.grav = grav; p.kind = kind; p.text = text; p.drag = drag;
  }
  burst(x: number, y: number, n: number, color: string, speed = 30, life = 0.5, grav = 60) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.5), color, 1, grav);
    }
  }
  sparks(x: number, y: number, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 60;
      this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.2 + Math.random() * 0.2, color, 1, 0, 1);
    }
  }
  damage(x: number, y: number, amount: number, crit: boolean, color?: string) {
    this.spawn(x + (Math.random() * 6 - 3), y - 6, 0, -22, 0.8, color || (crit ? '#ffd23f' : '#ffffff'), 1, 30, 2, crit ? `${amount}!` : `${amount}`, 0.96);
  }
  heal(x: number, y: number, amount: number) {
    this.spawn(x, y - 6, 0, -18, 0.8, '#7dff8a', 1, 20, 2, `+${amount}`);
  }
  update(dt: number) {
    for (let i = 0; i < POOL; i++) {
      const p = this.arr[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy += p.grav * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0 && !this.freeList.includes(i)) this.freeList.push(i);
    }
  }
  draw(g: CanvasRenderingContext2D, ox: number, oy: number) {
    for (let i = 0; i < POOL; i++) {
      const p = this.arr[i];
      if (p.life <= 0) continue;
      const a = Math.min(1, p.life / (p.maxLife * 0.4));
      g.globalAlpha = a;
      g.fillStyle = p.color;
      const sx = Math.round(p.x - ox), sy = Math.round(p.y - oy);
      if (p.kind === 1) {
        g.fillRect(sx, sy, Math.max(1, Math.abs(p.vx) * 0.03 + 1), 1);
      } else if (p.kind === 2 && p.text) {
        g.font = '5px monospace';
        g.fillText(p.text, sx, sy);
      } else {
        g.fillRect(sx, sy, p.size, p.size);
      }
    }
    g.globalAlpha = 1;
  }
}
