// Fixed-timestep game loop with render interpolation cap.
export class GameLoop {
  private acc = 0; private last = 0; private raf = 0;
  private readonly step = 1 / 60;
  running = false;
  constructor(private update: (dt: number) => void, private render: () => void) {}
  start() {
    if (this.running) return;
    this.running = true; this.last = performance.now();
    const tick = (t: number) => {
      if (!this.running) return;
      let dt = (t - this.last) / 1000; this.last = t;
      if (dt > 0.25) dt = 0.25;
      this.acc += dt;
      let n = 0;
      while (this.acc >= this.step && n < 5) { this.update(this.step); this.acc -= this.step; n++; }
      if (n === 5) this.acc = 0;
      this.render();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); }
}
