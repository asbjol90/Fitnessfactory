/**
 * Game sounds, synthesised. No files, one voice. Call `unlock()` from a user
 * gesture once; every sound is short and fire-and-forget. Volume 0 = muted.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.5;

export function unlock(): void {
  if (ctx) { if (ctx.state === 'suspended') void ctx.resume(); return; }
  const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = volume; master.connect(ctx.destination);
}
export function setVolume(v: number): void { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = volume; }
export const getVolume = () => volume;
function live(): { c: AudioContext; m: GainNode } | null { return ctx && master && volume > 0 ? { c: ctx, m: master } : null; }

// ---------------------------------------------------------------- primitives
function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; attack?: number; to?: number; delay?: number; lp?: number } = {}): void {
  const L = live(); if (!L) return; const { c: ctx, m: master } = L;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const o = ctx.createOscillator(); o.type = opts.type ?? 'sine'; o.frequency.setValueAtTime(freq, t0);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t0 + (opts.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node: AudioNode = o;
  if (opts.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; o.connect(f); node = f; }
  node.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
let noiseBuf: AudioBuffer | null = null;
function noise(dur: number, opts: { gain?: number; hp?: number; lp?: number; bp?: number; q?: number; delay?: number; decay?: number } = {}): void {
  const L = live(); if (!L) return; const { c: ctx, m: master } = L;
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  let node: AudioNode = src;
  if (opts.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = opts.hp; node.connect(f); node = f; }
  if (opts.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; node.connect(f); node = f; }
  if (opts.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = opts.bp; f.Q.value = opts.q ?? 4; node.connect(f); node = f; }
  const g = ctx.createGain(); g.gain.setValueAtTime(opts.gain ?? 0.3, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.decay ?? dur));
  node.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.02);
}

// ---------------------------------------------------------------- vocabulary
// Second pass: warmer and quieter. Filtered noise and low thumps; no square waves,
// no high pure tones. The oven hiss and crusher crunch are the reference voice.
export const SFX = {
  // training
  logCardio() { tone(60, 0.1, { gain: 0.25, to: 40 }); tone(58, 0.1, { gain: 0.22, to: 38, delay: 0.22 }); [0.45, 0.52, 0.6, 0.66].forEach((d, i) => noise(0.05, { gain: 0.16 - i * 0.02, bp: 1100 + i * 150, q: 4, delay: d })); tone(90, 0.12, { gain: 0.12, to: 55, delay: 0.44 }); },
  logStrength() { tone(70, 0.3, { gain: 0.35, to: 40 }); noise(0.12, { gain: 0.12, lp: 300 }); },
  logFlex() { noise(0.55, { gain: 0.12, lp: 900, decay: 0.55 }); tone(196, 0.5, { type: 'triangle', gain: 0.06, attack: 0.15, lp: 600 }); },
  habit() { noise(0.03, { gain: 0.12, bp: 1500, q: 8 }); },
  emptyHanded() { noise(0.5, { gain: 0.1, lp: 500, decay: 0.5 }); tone(120, 0.4, { type: 'triangle', gain: 0.08, to: 80, lp: 400 }); },

  // factory
  make() { noise(0.08, { gain: 0.22, bp: 800, q: 3 }); tone(150, 0.14, { gain: 0.2, to: 90 }); },
  makeHammer() { tone(85, 0.1, { gain: 0.3, to: 50 }); noise(0.02, { gain: 0.14, bp: 2600, q: 6 }); tone(740, 0.28, { type: 'triangle', gain: 0.04, lp: 1800 }); },
  makeHiss() { noise(0.45, { gain: 0.11, bp: 900, q: 1, decay: 0.45 }); tone(80, 0.12, { gain: 0.16, to: 45 }); },
  makeCrunch() { noise(0.12, { gain: 0.35, lp: 500 }); noise(0.05, { gain: 0.25, bp: 900, q: 3, delay: 0.08 }); },
  belt() { noise(0.25, { gain: 0.12, lp: 400, decay: 0.25 }); tone(60, 0.2, { gain: 0.1, lp: 200 }); },
  coin() { tone(880, 0.12, { type: 'triangle', gain: 0.07, lp: 1800 }); tone(1175, 0.22, { type: 'triangle', gain: 0.06, lp: 1800, delay: 0.09 }); },
  starved() { noise(0.04, { gain: 0.08, lp: 500 }); },
  sell() { noise(0.03, { gain: 0.12, bp: 1800, q: 6 }); noise(0.03, { gain: 0.1, bp: 2200, q: 6, delay: 0.07 }); tone(988, 0.16, { type: 'triangle', gain: 0.05, lp: 1800, delay: 0.12 }); },
  build() { tone(65, 0.25, { gain: 0.35, to: 40 }); noise(0.1, { gain: 0.14, lp: 400 }); noise(0.025, { gain: 0.12, bp: 2000, q: 6, delay: 0.3 }); noise(0.025, { gain: 0.1, bp: 2400, q: 6, delay: 0.42 }); },
  demolish() { noise(0.5, { gain: 0.22, lp: 450, decay: 0.5 }); [0.05, 0.18, 0.3].forEach(d => noise(0.05, { gain: 0.12, bp: 800, q: 3, delay: d })); tone(55, 0.3, { gain: 0.2, to: 35 }); },
  /** Soft boots on dirt, scaled by how many are walking. */
  march(n: number) { const g = Math.min(0.12, 0.03 + n * 0.012); noise(0.06, { gain: g, lp: 220 }); noise(0.05, { gain: g * 0.7, lp: 200, delay: 0.3 }); },

  // defence
  raidAlert() { for (const d of [0, 0.45]) { tone(55, 0.35, { gain: 0.4, to: 38, delay: d }); noise(0.12, { gain: 0.15, lp: 250, delay: d }); } tone(110, 0.9, { type: 'triangle', gain: 0.08, attack: 0.2, lp: 400, delay: 0.1 }); },
  mortar() { tone(70, 0.3, { gain: 0.4, to: 32 }); noise(0.2, { gain: 0.22, lp: 350, decay: 0.2 }); [0.18, 0.26, 0.33].forEach(d => noise(0.04, { gain: 0.08, bp: 900, q: 4, delay: d })); },
  shotgun() { noise(0.18, { gain: 0.35, lp: 1500, decay: 0.18 }); tone(100, 0.16, { gain: 0.3, to: 45 }); noise(0.35, { gain: 0.06, lp: 600, delay: 0.08, decay: 0.35 }); noise(0.02, { gain: 0.08, bp: 1500, q: 6, delay: 0.32 }); noise(0.02, { gain: 0.07, bp: 1300, q: 6, delay: 0.4 }); },
  rifle() { noise(0.05, { gain: 0.22, hp: 500, lp: 3000, decay: 0.05 }); tone(220, 0.05, { type: 'triangle', gain: 0.08, to: 120, lp: 800 }); noise(0.25, { gain: 0.05, lp: 700, delay: 0.05, decay: 0.25 }); },
  minigun() { for (let i = 0; i < 4; i++) noise(0.035, { gain: 0.2 - i * 0.02, hp: 400, lp: 2500, decay: 0.035, delay: i * 0.055 }); tone(90, 0.26, { type: 'triangle', gain: 0.07, lp: 300, to: 70 }); noise(0.3, { gain: 0.05, lp: 600, delay: 0.1, decay: 0.3 }); },
  doubleMinigun() { for (let i = 0; i < 6; i++) noise(0.035, { gain: 0.2, hp: 350, lp: 2200, decay: 0.035, delay: i * 0.04 }); tone(75, 0.3, { type: 'triangle', gain: 0.09, lp: 300 }); },
  hit() { noise(0.05, { gain: 0.12, lp: 600 }); tone(170, 0.07, { type: 'triangle', gain: 0.08, to: 110, lp: 500 }); },
  raiderDown() { tone(160, 0.18, { type: 'triangle', gain: 0.1, to: 90, lp: 600 }); tone(55, 0.2, { gain: 0.25, to: 38, delay: 0.16 }); noise(0.2, { gain: 0.1, lp: 350, delay: 0.16, decay: 0.2 }); },
  gateHit() { tone(55, 0.3, { gain: 0.4, to: 35 }); noise(0.1, { gain: 0.2, lp: 300 }); },
  rally() { [196, 262, 330].forEach((f, i) => tone(f, 0.16, { type: 'triangle', gain: 0.09, attack: 0.02, lp: 1200, delay: i * 0.1 })); noise(0.2, { gain: 0.08, lp: 500, delay: 0.05, decay: 0.2 }); },
  repelled() { [262, 330, 392].forEach((f, i) => tone(f, 0.4, { type: 'triangle', gain: 0.09, attack: 0.06, lp: 1400, delay: i * 0.18 })); tone(523, 0.7, { type: 'triangle', gain: 0.08, attack: 0.08, lp: 1400, delay: 0.54 }); },
  breach() { tone(140, 0.5, { type: 'triangle', gain: 0.25, to: 60, lp: 500 }); noise(0.6, { gain: 0.18, lp: 220, decay: 0.6 }); tone(90, 0.7, { type: 'triangle', gain: 0.2, to: 45, lp: 400, delay: 0.3 }); },
} as const;
export type SfxId = keyof typeof SFX;

/** Machine voice for a production burst. */
export function makeSoundFor(def: string): void {
  if (def === 'furnace') SFX.makeHammer();
  else if (def === 'coke_oven' || def === 'chemical_works' || def === 'refinery') SFX.makeHiss();
  else if (def === 'crusher') SFX.makeCrunch();
  else SFX.make();
}
const KEY = 'fitnessfactory_sound';
export const soundEnabled = () => localStorage.getItem(KEY) === '1';
export function setSoundEnabled(on: boolean): void { localStorage.setItem(KEY, on ? '1' : '0'); setVolume(on ? 0.5 : 0); if (on) unlock(); }
