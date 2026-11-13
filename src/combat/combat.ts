// Damage, elements, status effects, projectiles.
import { Element, WEAK_TO } from '../entities/enemies';

export interface StatusFx { burn: number; freeze: number; poison: number; shock: number; }
export function newStatus(): StatusFx { return { burn: 0, freeze: 0, poison: 0, shock: 0 }; }
export function elementOfStatus(el: Element): keyof StatusFx | null {
  if (el === 'fire') return 'burn'; if (el === 'ice') return 'freeze'; if (el === 'poison') return 'poison'; if (el === 'lightning') return 'shock';
  return null;
}
export interface DamageResult { amount: number; crit: boolean; elementMul: number; }
export function computeDamage(atk: number, def: number, attackerEl: Element, defenderWeak: Element, defenderEl: Element, luck: number, variance: () => number): DamageResult {
  let mul = 1;
  if (attackerEl !== 'none' && defenderWeak === attackerEl) mul = 1.5;
  else if (attackerEl !== 'none' && defenderEl === attackerEl) mul = 0.6;
  const crit = variance() < 0.08 + luck * 0.004;
  let amount = Math.max(1, Math.round((atk * (0.9 + variance() * 0.25) - def * 0.7) * mul * (crit ? 1.8 : 1)));
  return { amount, crit, elementMul: mul };
}
export interface Projectile {
  x: number; y: number; vx: number; vy: number; life: number;
  dmg: number; element: Element; fromPlayer: boolean; kind: 'arrow' | 'ember' | 'orb' | 'shard' | 'homing';
  target?: { x: number; y: number; id: number }; pierce: boolean; radius: number;
}
export class ProjectilePool {
  list: Projectile[] = [];
  spawn(p: Omit<Projectile, 'pierce' | 'radius'> & Partial<Projectile>) {
    if (this.list.length > 120) this.list.shift();
    this.list.push({ pierce: false, radius: 4, ...p });
  }
  update(dt: number, hitTest: (p: Projectile) => boolean) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.kind === 'homing' && p.target) {
        const a = Math.atan2(p.target.y - p.y, p.target.x - p.x);
        const sp = Math.hypot(p.vx, p.vy);
        const cur = Math.atan2(p.vy, p.vx);
        let da = a - cur;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const na = cur + Math.max(-3 * dt, Math.min(3 * dt, da));
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0 || hitTest(p)) {
        if (!p.pierce) this.list.splice(i, 1);
      }
    }
  }
  draw(g: CanvasRenderingContext2D, ox: number, oy: number) {
    for (const p of this.list) {
      const sx = Math.round(p.x - ox), sy = Math.round(p.y - oy);
      switch (p.kind) {
        case 'arrow': g.fillStyle = '#d9c89a'; g.fillRect(sx - 2, sy - 1, 5, 2); g.fillStyle = '#b8b8c0'; g.fillRect(sx + 2, sy - 1, 2, 2); break;
        case 'ember': g.fillStyle = '#ff6a2a'; g.fillRect(sx - 2, sy - 2, 4, 4); g.fillStyle = '#fff3c4'; g.fillRect(sx - 1, sy - 1, 2, 2); break;
        case 'orb': g.fillStyle = '#a83aff'; g.fillRect(sx - 2, sy - 2, 5, 5); g.fillStyle = '#e8c8ff'; g.fillRect(sx - 1, sy - 1, 2, 2); break;
        case 'shard': g.fillStyle = '#8ad8f0'; g.fillRect(sx - 2, sy - 2, 4, 4); break;
        case 'homing': g.fillStyle = '#8a5ae8'; g.fillRect(sx - 3, sy - 3, 6, 6); g.fillStyle = '#fff'; g.fillRect(sx - 1, sy - 1, 2, 2); break;
      }
    }
  }
}
// hit arc test: is (px,py) within attack arc from (ax,ay) facing dirAngle?
export function inArc(ax: number, ay: number, dirAngle: number, px: number, py: number, range: number, arcRad: number): boolean {
  const dx = px - ax, dy = py - ay;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  let da = Math.atan2(dy, dx) - dirAngle;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  return Math.abs(da) <= arcRad / 2;
}
