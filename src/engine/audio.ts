// Web Audio chiptune engine: procedural tracks + synthesized SFX. Starts on first tap.
type Wave = OscillatorType;
interface Note { f: number; t: number; d: number; w: Wave; v: number; }
export interface Track {
  name: string; bpm: number; wave: Wave; bassWave: Wave;
  melody: number[]; // scale degrees, -1 = rest, per 8th step
  bass: number[];
  scale: number[]; // semitone offsets
  root: number; vol: number; drums: boolean; len: number;
}
const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], penta: [0, 2, 4, 7, 9],
};
function mkTrack(name: string, bpm: number, wave: Wave, bassWave: Wave, scale: string, root: number, mel: number[], bass: number[], vol = 0.5, drums = true): Track {
  return { name, bpm, wave, bassWave, scale: SCALES[scale], root, melody: mel, bass, vol, drums, len: Math.max(mel.length, bass.length) };
}
// 12+ tracks
export const TRACKS: Record<string, Track> = {
  title:   mkTrack('Emberfall', 92, 'triangle', 'sine', 'minor', 220, [0,-1,2,-1,4,-1,3,-1,2,-1,0,-1,-1,-1,-1,-1, 4,-1,5,-1,7,-1,5,-1,4,-1,2,-1,-1,-1,-1,-1], [0,-1,-1,-1,0,-1,-1,-1,-3,-1,-1,-1,-4,-1,-1,-1], 0.5, false),
  village: mkTrack('Hearthlight', 104, 'square', 'triangle', 'major', 262, [0,-1,2,4,-1,4,2,-1,0,-1,-1,2,-1,-1,-1,-1, 4,-1,5,4,-1,2,0,-1,-1,-1,-1,-1,-1,-1,-1,-1], [0,0,-1,-1,-3,-3,-1,-1,-4,-4,-1,-1,-3,-1,-1,-1], 0.42, false),
  forest:  mkTrack('Mirewood', 100, 'triangle', 'sine', 'dorian', 233, [0,2,-1,4,-1,-1,3,2,-1,1,0,-1,-1,-1,-1,-1, 2,-1,4,6,-1,5,4,-1,3,2,1,-1,0,-1,-1,-1], [0,-1,-1,0,-1,-1,-3,-1,-4,-1,-1,-4,-1,-1,-3,-1], 0.4, false),
  plains:  mkTrack('Open Sky', 112, 'square', 'triangle', 'lydian', 247, [0,-1,-1,2,-1,4,-1,-1,5,-1,4,-1,2,-1,-1,-1], [0,-1,0,-1,-3,-1,-4,-1], 0.38, false),
  desert:  mkTrack('Sunscar', 96, 'sawtooth', 'sine', 'phrygian', 220, [0,-1,1,-1,0,-1,-1,4,-1,3,-1,1,-1,0,-1,-1, 0,-1,1,0,-1,-1,5,-1,4,-1,3,-1,1,-1,-1,-1], [0,0,-1,0,-1,-1,0,-1,-4,-4,-1,-4,-1,-1,-4,-1], 0.36, true),
  tundra:  mkTrack('White Silence', 80, 'sine', 'sine', 'minor', 294, [0,-1,-1,-1,3,-1,-1,2,-1,-1,-1,-1,-1,-1,-1,-1, 4,-1,-1,-1,2,-1,-1,-1,0,-1,-1,-1,-1,-1,-1,-1], [0,-1,-1,-1,-1,-1,-1,-1,-4,-1,-1,-1,-1,-1,-1,-1], 0.4, false),
  swamp:   mkTrack('Boglights', 88, 'triangle', 'sawtooth', 'phrygian', 196, [0,-1,1,0,-1,-1,3,-1,-1,1,-1,0,-1,-1,-1,-1], [0,-1,-1,0,0,-1,-1,0,-4,-1,-1,-4,-4,-1,-1,-4], 0.38, false),
  volcanic:mkTrack('Emberdeep', 120, 'sawtooth', 'sawtooth', 'phrygian', 165, [0,0,-1,3,-1,1,0,-1,0,0,-1,4,-1,3,1,-1, 5,-1,4,-1,3,-1,1,0,-1,-1,-1,-1,-1,-1,-1,-1], [0,0,0,-1,-4,-4,-4,-1,0,0,0,-1,-3,-3,-4,-4], 0.4, true),
  jungle:  mkTrack('Verdant Pulse', 116, 'square', 'triangle', 'dorian', 262, [0,2,0,-1,4,-1,2,4,-1,0,2,-1,0,-1,-1,-1], [0,-1,0,-1,-4,-1,-4,-1,-3,-1,-3,-1,-4,-1,-4,-1], 0.36, true),
  cave:    mkTrack('Underworld', 72, 'sine', 'sine', 'minor', 175, [0,-1,-1,-1,-1,-1,2,-1,-1,-1,1,-1,-1,-1,-1,-1, 0,-1,-1,-1,-1,-1,-1,-1,3,-1,-1,-1,2,-1,-1,-1], [0,-1,-1,-1,-1,-1,-1,-1,-5,-1,-1,-1,-1,-1,-1,-1], 0.42, false),
  dungeon: mkTrack('Depths Below', 108, 'triangle', 'sawtooth', 'phrygian', 185, [0,-1,0,1,-1,0,-1,-1,3,-1,-1,1,-1,0,-1,-1], [0,0,-1,-1,0,0,-1,-1,-4,-4,-1,-1,-5,-5,-1,-1], 0.4, true),
  boss:    mkTrack('Guardian of Ash', 138, 'sawtooth', 'sawtooth', 'minor', 196, [0,0,3,-1,0,0,5,-1,0,0,3,-1,6,5,3,-1, 0,0,3,-1,0,0,5,-1,7,-1,6,-1,5,-1,3,-1], [0,0,0,0,-1,-1,-1,-1,-4,-4,-4,-4,-3,-3,-5,-5], 0.45, true),
  cutscene:mkTrack('The Shattering', 66, 'triangle', 'sine', 'minor', 220, [0,-1,-1,4,-1,-1,3,-1,-1,2,-1,-1,-1,-1,-1,-1], [0,-1,-1,-1,-4,-1,-1,-1,-3,-1,-1,-1,-5,-1,-1,-1], 0.45, false),
  victory: mkTrack('Dawn Rekindled', 120, 'square', 'triangle', 'major', 294, [0,2,4,-1,7,-1,4,-1,5,4,2,-1,0,-1,-1,-1], [0,0,-1,-1,-3,-3,-1,-1,-4,-4,-1,-1,0,0,-1,-1], 0.45, true),
  snow:    mkTrack('Frostfall', 84, 'sine', 'triangle', 'minor', 262, [0,-1,2,-1,-1,-1,4,-1,3,-1,-1,-1,2,-1,-1,-1], [0,-1,-1,-1,-4,-1,-1,-1], 0.38, false),
  blight:  mkTrack('The Blight', 96, 'sawtooth', 'sawtooth', 'phrygian', 147, [0,1,-1,0,-1,-1,1,0,-1,-1,0,1,-1,0,-1,-1], [0,-1,0,-1,0,-1,0,-1,-4,-1,-4,-1,-5,-1,-4,-1], 0.4, true),
};
class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  private cur: Track | null = null;
  private next_: Track | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  musicVol = 0.6; sfxVol = 0.8; muted = false;
  private noiseBuf: AudioBuffer | null = null;
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 1; this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = this.musicVol; this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = this.sfxVol; this.sfxGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.timer = window.setInterval(() => this.schedule(), 40);
    } catch { this.ctx = null; }
  }
  setMusicVol(v: number) { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = v; }
  setSfxVol(v: number) { this.sfxVol = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  play(name: string) {
    const t = TRACKS[name]; if (!t) return;
    if (this.cur === t) return;
    this.next_ = t;
  }
  stopMusic() { this.cur = null; this.next_ = null; }
  private noteFreq(track: Track, deg: number): number {
    const sc = track.scale;
    const oct = Math.floor(deg / sc.length);
    const idx = ((deg % sc.length) + sc.length) % sc.length;
    return track.root * Math.pow(2, (sc[idx] + oct * 12) / 12);
  }
  private schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.next_ && this.next_ !== this.cur) { this.cur = this.next_; this.step = 0; this.nextTime = this.ctx.currentTime + 0.06; }
    const t = this.cur; if (!t) return;
    const spb = 60 / t.bpm / 2; // 8th notes
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const i = this.step % t.len;
      const m = t.melody[i % t.melody.length];
      if (m >= 0) this.blip(this.noteFreq(t, m), this.nextTime, spb * 0.9, t.wave, t.vol * 0.5, this.musicGain!);
      const b = t.bass[i % t.bass.length];
      if (b !== undefined && b > -99 && i % 2 === 0) this.blip(this.noteFreq(t, b) / 2, this.nextTime, spb * 1.8, t.bassWave, t.vol * 0.45, this.musicGain!);
      if (t.drums && i % 4 === 0) this.noise(this.nextTime, 0.03, t.vol * 0.25, 800);
      if (t.drums && i % 8 === 4) this.noise(this.nextTime, 0.08, t.vol * 0.3, 3000);
      this.nextTime += spb; this.step++;
    }
  }
  private blip(f: number, t: number, d: number, w: Wave, v: number, dest: GainNode) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = w; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05);
  }
  private noise(t: number, d: number, v: number, filterFreq: number) {
    if (!this.ctx || !this.noiseBuf || !this.sfxGain) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + d + 0.02);
  }
  // ---- SFX (40+) ----
  sfx(name: string) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const B = (f: number, d: number, w: Wave, v: number, slide = 0) => {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = w; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(this.sfxGain!); o.start(t); o.stop(t + d + 0.02);
    };
    const N = (d: number, v: number, ff: number) => this.noise(t, d, v, ff);
    switch (name) {
      case 'swing': N(0.08, 0.25, 4000); B(300, 0.08, 'square', 0.1, 400); break;
      case 'swing2': N(0.09, 0.28, 3500); B(350, 0.09, 'square', 0.12, 500); break;
      case 'swing3': N(0.14, 0.35, 2500); B(200, 0.14, 'sawtooth', 0.18, 600); break;
      case 'hit': N(0.06, 0.4, 1800); B(160, 0.09, 'square', 0.22, -80); break;
      case 'crit': N(0.1, 0.45, 2500); B(520, 0.16, 'square', 0.25, -300); B(780, 0.1, 'square', 0.15, -200); break;
      case 'hurt': B(220, 0.18, 'sawtooth', 0.3, -140); N(0.08, 0.2, 900); break;
      case 'die': B(300, 0.5, 'sawtooth', 0.28, -260); N(0.3, 0.25, 700); break;
      case 'roll': N(0.12, 0.18, 1200); break;
      case 'step': N(0.03, 0.06, 900); break;
      case 'coin': B(900, 0.06, 'square', 0.18); B(1350, 0.12, 'square', 0.16); break;
      case 'pickup': B(660, 0.07, 'square', 0.16, 220); break;
      case 'potion': B(400, 0.2, 'sine', 0.2, 300); break;
      case 'heal': B(520, 0.25, 'sine', 0.2, 260); B(780, 0.3, 'sine', 0.12, 200); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.sfxBlip(f), i * 90)); break;
      case 'quest': [392, 523, 659].forEach((f, i) => setTimeout(() => this.sfxBlip(f), i * 110)); break;
      case 'achieve': [659, 784, 988, 1319].forEach((f, i) => setTimeout(() => this.sfxBlip(f), i * 80)); break;
      case 'door': B(120, 0.3, 'sawtooth', 0.2, -40); N(0.15, 0.15, 500); break;
      case 'chest': B(330, 0.1, 'square', 0.18); B(495, 0.18, 'square', 0.16); break;
      case 'chop': N(0.06, 0.3, 1500); B(140, 0.06, 'square', 0.15, -40); break;
      case 'mine': N(0.07, 0.35, 3000); B(220, 0.05, 'square', 0.14, -60); break;
      case 'break': N(0.15, 0.4, 2200); B(90, 0.12, 'sawtooth', 0.2, -30); break;
      case 'place': N(0.05, 0.25, 1000); B(180, 0.06, 'square', 0.14); break;
      case 'bow': N(0.06, 0.15, 5000); B(800, 0.08, 'sine', 0.12, -500); break;
      case 'arrowhit': N(0.05, 0.3, 2000); B(240, 0.05, 'square', 0.14, -80); break;
      case 'bomb': B(80, 0.5, 'sawtooth', 0.4, -50); N(0.4, 0.5, 600); break;
      case 'explosion': B(60, 0.7, 'sawtooth', 0.45, -30); N(0.5, 0.5, 400); break;
      case 'fire': N(0.2, 0.22, 2500); B(300, 0.2, 'sawtooth', 0.1, 150); break;
      case 'ice': B(1200, 0.15, 'sine', 0.18, -600); N(0.1, 0.12, 6000); break;
      case 'shock': B(1800, 0.08, 'square', 0.14, -1400); N(0.06, 0.15, 7000); break;
      case 'poison': B(300, 0.3, 'sine', 0.14, -150); break;
      case 'splash': N(0.2, 0.25, 1800); break;
      case 'fish': N(0.1, 0.2, 2500); B(500, 0.15, 'sine', 0.15, 300); break;
      case 'catch': [523, 784].forEach((f, i) => setTimeout(() => this.sfxBlip(f), i * 100)); break;
      case 'teleport': B(200, 0.4, 'sine', 0.22, 800); N(0.2, 0.12, 4000); break;
      case 'portal': B(150, 0.6, 'sine', 0.22, 500); break;
      case 'shrine': B(660, 0.5, 'sine', 0.18, 220); B(990, 0.6, 'sine', 0.1); break;
      case 'ui': B(700, 0.04, 'square', 0.1); break;
      case 'uiOpen': B(500, 0.06, 'square', 0.12, 200); break;
      case 'uiClose': B(600, 0.06, 'square', 0.1, -200); break;
      case 'error': B(200, 0.15, 'square', 0.18, -60); break;
      case 'craft': N(0.08, 0.25, 2500); B(440, 0.12, 'square', 0.14, 100); break;
      case 'cook': N(0.3, 0.15, 3000); B(350, 0.2, 'sine', 0.1, 100); break;
      case 'dice': N(0.05, 0.2, 4000); setTimeout(() => N(0.05, 0.18, 3500), 90); setTimeout(() => N(0.06, 0.2, 3000), 190); break;
      case 'card': N(0.04, 0.15, 5000); break;
      case 'roar': B(90, 0.8, 'sawtooth', 0.4, 60); N(0.5, 0.3, 500); break;
      case 'bosshit': N(0.08, 0.4, 1500); B(120, 0.12, 'sawtooth', 0.25, -60); break;
      case 'thunder': N(0.6, 0.4, 300); B(70, 0.5, 'sawtooth', 0.3, -30); break;
      case 'rain': N(0.4, 0.08, 5000); break;
      case 'eat': N(0.08, 0.2, 1200); setTimeout(() => N(0.08, 0.18, 1000), 120); break;
      case 'sleep': B(440, 0.5, 'sine', 0.12, -220); break;
      case 'talk': B(500 + Math.random() * 300, 0.05, 'square', 0.08); break;
      case 'secret': [880, 1108, 1318, 1760].forEach((f, i) => setTimeout(() => this.sfxBlip(f), i * 70)); break;
      case 'trap': N(0.05, 0.3, 3000); B(400, 0.08, 'square', 0.16, -200); break;
      case 'switch': B(600, 0.08, 'square', 0.16, -250); break;
      case 'pet': B(700, 0.08, 'sine', 0.15, 300); break;
      case 'mount': N(0.1, 0.2, 800); B(200, 0.1, 'square', 0.12); break;
      case 'photo': B(1200, 0.05, 'square', 0.15); N(0.03, 0.2, 6000); break;
      case 'meteor': N(0.5, 0.3, 900); B(100, 0.4, 'sawtooth', 0.25, -50); break;
      default: B(440, 0.08, 'square', 0.1);
    }
  }
  private sfxBlip(f: number) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(this.sfxGain); o.start(t); o.stop(t + 0.2);
  }
}
export const audio = new AudioEngine();
