/**
 * Raid recap: raiders march from the outside toward the wall, turrets fire on
 * each tick, raiders drop as damage accumulates. Reconstructed from the
 * RaidRecord — no live sim. Uses SMIL so it runs on a timeline without JS.
 */
import { TURRETS, type RaidRecord } from '../engine';

export interface RaidGeometry {
  turrets: Array<{ iid: string; slot: number; cx: number; cy: number }>;
  raidBox: { cx: number; top: number };
  lineY: number;
}

const TICK = 0.5;   // seconds per raid tick
const START = 0.5;  // delay before the first step

export function playRaid(svg: SVGSVGElement, r: RaidRecord, g: RaidGeometry): void {
  svg.querySelector('.raid-play')?.remove();
  const NS = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(NS, 'g');
  layer.setAttribute('class', 'raid-play');

  const ticks = Math.max(1, r.ticksUsed);
  const walkTo = g.lineY + 10;              // just outside the wall
  const walk = g.raidBox.top - walkTo;      // distance in SVG units (positive = up)
  const n = r.raiders;
  const startX = (i: number) => g.raidBox.cx + (i - (n - 1) / 2) * Math.min(14, 90 / Math.max(1, n));

  // Per-tick damage: every turret with shots ≥ t fired on tick t.
  const dmgAt = (t: number) => r.shots.filter(s => s.shots >= t).reduce((a, s) => a + TURRETS[s.def].damage, 0);
  const deathTick: number[] = Array.from({ length: n }, () => Infinity);
  let cum = 0;
  for (let t = 1; t <= ticks; t++) {
    cum += dmgAt(t);
    for (let k = 0; k < n; k++) if (deathTick[k] === Infinity && cum >= (k + 1) * r.hpEach) deathTick[k] = t;
  }
  const yAtTick = (t: number) => g.raidBox.top - walk * Math.min(1, t / ticks);

  // Raiders
  for (let i = 0; i < n; i++) {
    const rg = document.createElementNS(NS, 'g');
    rg.setAttribute('transform', `translate(${startX(i)},${g.raidBox.top})`);
    rg.innerHTML = `<g class="raider"><circle r="6" fill="var(--danger)"/><circle cx="-2.2" cy="-1" r="1.4" fill="var(--bg)"/><circle cx="2.2" cy="-1" r="1.4" fill="var(--bg)"/><rect x="-2" y="2" width="4" height="2" fill="var(--bg)"/></g>`;
    const move = document.createElementNS(NS, 'animateTransform');
    move.setAttribute('attributeName', 'transform'); move.setAttribute('type', 'translate');
    move.setAttribute('from', `${startX(i)} ${g.raidBox.top}`); move.setAttribute('to', `${startX(i)} ${walkTo}`);
    move.setAttribute('begin', `${START}s`); move.setAttribute('dur', `${ticks * TICK}s`); move.setAttribute('fill', 'freeze');
    rg.append(move);
    const dt = deathTick[i]!;
    if (dt !== Infinity) {
      const die = document.createElementNS(NS, 'animate');
      die.setAttribute('attributeName', 'opacity'); die.setAttribute('from', '1'); die.setAttribute('to', '0');
      die.setAttribute('begin', `${START + dt * TICK}s`); die.setAttribute('dur', '0.3s'); die.setAttribute('fill', 'freeze');
      rg.append(die);
    } else if (!r.repelled) {
      // Survivor breaches the wall after the last tick.
      const through = document.createElementNS(NS, 'animateTransform');
      through.setAttribute('attributeName', 'transform'); through.setAttribute('type', 'translate');
      through.setAttribute('from', `${startX(i)} ${walkTo}`); through.setAttribute('to', `${startX(i)} ${g.lineY - 40}`);
      through.setAttribute('begin', `${START + ticks * TICK + 0.2}s`); through.setAttribute('dur', '0.6s'); through.setAttribute('fill', 'freeze');
      rg.append(through);
    }
    layer.append(rg);
  }

  // Shots: a tracer from each firing turret to the raider line, plus the turret's muzzle flash.
  for (let t = 1; t <= ticks; t++) {
    const when = START + (t - 0.5) * TICK;
    const targetY = yAtTick(t - 0.5);
    for (const s of r.shots) {
      if (s.shots < t) continue;
      const tp = g.turrets.find(x => x.iid === s.turretIid);
      if (!tp) continue;
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', String(tp.cx)); line.setAttribute('y1', String(tp.cy));
      line.setAttribute('x2', String(g.raidBox.cx)); line.setAttribute('y2', String(targetY));
      line.setAttribute('stroke', 'var(--flame)'); line.setAttribute('stroke-width', '2'); line.setAttribute('opacity', '0');
      const flash = document.createElementNS(NS, 'animate');
      flash.setAttribute('attributeName', 'opacity'); flash.setAttribute('values', '0;1;0'); flash.setAttribute('begin', `${when}s`); flash.setAttribute('dur', '0.18s');
      line.append(flash);
      layer.append(line);
      const muzzle = svg.querySelector(`[data-slot="${tp.slot}"] .muzzle path`);
      if (muzzle) {
        const m = document.createElementNS(NS, 'animate');
        m.setAttribute('attributeName', 'opacity'); m.setAttribute('values', '0;1;0'); m.setAttribute('begin', `${when}s`); m.setAttribute('dur', '0.15s');
        muzzle.append(m);
      }
    }
  }

  // Verdict flash across the floor.
  const end = START + ticks * TICK + (r.repelled ? 0.2 : 0.9);
  const veil = document.createElementNS(NS, 'rect');
  veil.setAttribute('x', '0'); veil.setAttribute('y', '0'); veil.setAttribute('width', '100%'); veil.setAttribute('height', '100%');
  veil.setAttribute('fill', r.repelled ? 'var(--ok)' : 'var(--danger)'); veil.setAttribute('opacity', '0'); veil.setAttribute('pointer-events', 'none');
  const v = document.createElementNS(NS, 'animate');
  v.setAttribute('attributeName', 'opacity'); v.setAttribute('values', '0;0.25;0'); v.setAttribute('begin', `${end}s`); v.setAttribute('dur', '0.6s');
  veil.append(v);
  layer.append(veil);

  svg.append(layer);
  setTimeout(() => layer.remove(), (end + 1.5) * 1000);
}
