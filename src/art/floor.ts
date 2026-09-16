/**
 * Environment art for the factory floor. Everything here is markup-only; the
 * screen composes it. Colors are CSS variables so the dark theme stays one place.
 */
import { RESOURCES, type ResourceId, type State } from '../engine';
import { iconInner } from './nodes';

export function floorDefs(): string {
  return `<defs>
  <pattern id="p-concrete" width="48" height="48" patternUnits="userSpaceOnUse">
    <rect width="48" height="48" fill="var(--floor)"/>
    <path d="M0 0H48M0 0V48M24 0V48M0 24H48" stroke="var(--floor-line)" stroke-width="1"/>
    <path d="M3 44l6-3M30 8l5 4M40 40l4-6" stroke="var(--grime)" stroke-width="1.2" opacity=".8"/>
    <circle cx="6" cy="17" r="1" fill="var(--floor-line)"/><circle cx="37" cy="29" r="1.4" fill="var(--grime)"/><circle cx="14" cy="36" r=".8" fill="var(--floor-line)"/><circle cx="43" cy="9" r=".9" fill="var(--grime)"/>
  </pattern>
  <pattern id="p-grate" width="6" height="6" patternUnits="userSpaceOnUse">
    <rect width="6" height="6" fill="var(--steel-dk)"/><rect x="1" y="1" width="4" height="4" fill="var(--grime)"/>
  </pattern>
  <pattern id="p-dirt" width="18" height="18" patternUnits="userSpaceOnUse">
    <rect width="18" height="18" fill="var(--dirt)"/>
    <circle cx="4" cy="6" r="1.2" fill="var(--dirt-2)"/><circle cx="13" cy="12" r="1.6" fill="var(--dirt-2)"/><circle cx="10" cy="3" r=".8" fill="var(--dirt-2)"/><circle cx="16" cy="16" r=".9" fill="var(--dirt-2)"/>
  </pattern>
  <pattern id="p-brick" width="16" height="8" patternUnits="userSpaceOnUse">
    <rect width="16" height="8" fill="var(--wall)"/>
    <path d="M0 4H16M8 0V4M0 4V8M16 4V8" stroke="var(--wall-mortar)" stroke-width="1"/>
  </pattern>
  <pattern id="p-hazard" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="12" fill="var(--hazard)"/><rect x="6" width="6" height="12" fill="var(--hazard-ink)"/>
  </pattern>
  <pattern id="p-rollers" width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill="var(--belt)"/><rect x="0" width="2" height="8" fill="var(--belt-roller)"/>
  </pattern>
  <radialGradient id="g-lamp" cx="50%" cy="0%" r="70%">
    <stop offset="0%" stop-color="var(--lamp)" stop-opacity=".10"/><stop offset="100%" stop-color="var(--lamp)" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="g-pad" cx="50%" cy="30%" r="80%">
    <stop offset="0%" stop-color="var(--pad-hi)"/><stop offset="100%" stop-color="var(--pad)"/>
  </radialGradient>
  <filter id="f-shadow" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".45"/>
  </filter>
  <filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>`;
}

export interface EnvGeometry { W: number; H: number; roomTop: number; rampartY: number; lineY: number; gateX: number; }

/** Ground, room, rampart strip, wall band with gate, lamps. Drawn first. */
export function environment(g: EnvGeometry): string {
  const { W, H, roomTop, rampartY, lineY, gateX } = g;
  const bandH = 16;
  const lamps = [W * 0.25, W * 0.5, W * 0.75];
  return `
<rect x="0" y="0" width="${W}" height="${H}" fill="url(#p-dirt)"/>
<rect x="0" y="${roomTop}" width="${W}" height="${lineY - roomTop}" fill="url(#p-concrete)"/>
<rect x="0" y="${rampartY}" width="${W}" height="${lineY - rampartY}" fill="var(--rampart)" opacity=".55"/>
<rect x="0" y="${roomTop}" width="${W}" height="3" fill="var(--wall-mortar)"/>
${lamps.map(x => `<g class="lamp"><rect x="${x - 7}" y="${roomTop}" width="14" height="6" fill="var(--steel-dk)"/><rect x="${x - 4}" y="${roomTop + 6}" width="8" height="3" fill="var(--lamp)" filter="url(#f-glow)"/><ellipse cx="${x}" cy="${roomTop + 70}" rx="110" ry="60" fill="url(#g-lamp)"/></g>`).join('')}
${grime(W, roomTop, rampartY)}
<rect x="0" y="${rampartY - 6}" width="${W}" height="5" fill="url(#p-grate)"/>
<rect x="0" y="${rampartY - 6}" width="${W}" height="1" fill="var(--steel)"/>
<rect x="0" y="${lineY - 4}" width="${W}" height="${bandH + 4}" fill="url(#p-brick)"/>
<rect x="0" y="${lineY - 4}" width="${W}" height="3" fill="var(--wall-top)"/>
${crenels(W, lineY - 9)}
<rect x="0" y="${lineY + bandH}" width="${W}" height="4" fill="#000" opacity=".35"/>
<rect x="${gateX - 16}" y="${lineY - 8}" width="32" height="${bandH + 8}" fill="var(--bg)"/>
<rect x="${gateX - 18}" y="${lineY - 10}" width="5" height="${bandH + 12}" fill="url(#p-hazard)"/><rect x="${gateX + 13}" y="${lineY - 10}" width="5" height="${bandH + 12}" fill="url(#p-hazard)"/>
<text x="${W - 14}" y="${lineY + 32}" text-anchor="end" class="wall-text" style="fill:var(--ink-dim)">OUTSIDE</text>`;
}
/** Oil stains and scuffs: fixed positions so the floor doesn't shimmer between renders. */
function grime(W: number, top: number, bottom: number): string {
  const spots = [[0.12, 0.35, 34, 12], [0.58, 0.22, 26, 9], [0.82, 0.62, 40, 14], [0.32, 0.78, 22, 8], [0.68, 0.85, 30, 10]] as const;
  return spots.map(([fx, fy, rx, ry]) => `<ellipse cx="${W * fx}" cy="${top + (bottom - top) * fy}" rx="${rx}" ry="${ry}" fill="var(--grime)" opacity=".55"/>`).join('') +
    `<rect x="${W * 0.45}" y="${top + 12}" width="3" height="${(bottom - top) * 0.3}" fill="var(--grime)" opacity=".5"/>`;
}
function crenels(W: number, y: number): string {
  let out = '';
  for (let x = 6; x < W; x += 20) out += `<rect x="${x}" y="${y}" width="10" height="6" fill="var(--wall-top)"/>`;
  return out;
}

/** Node base: a raised plate with shadow. `state` picks the outline. */
export function pad(x: number, y: number, w: number, h: number, state: 'normal' | 'sel' | 'target' | 'dark' = 'normal'): string {
  const stroke = state === 'sel' ? 'var(--hazard)' : state === 'target' ? 'var(--cardio)' : 'var(--pad-edge)';
  return `<g filter="url(#f-shadow)"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="url(#g-pad)" stroke="${stroke}" stroke-width="${state === 'normal' || state === 'dark' ? 1 : 2}"/></g>` +
    `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="5" fill="none" stroke="var(--pad-inner)" stroke-width="1"/>` +
    `<path d="M${x + 6} ${y + 9}V${y + 6}H${x + 9} M${x + w - 9} ${y + 6}H${x + w - 6}V${y + 9} M${x + 6} ${y + h - 9}V${y + h - 6}H${x + 9} M${x + w - 9} ${y + h - 6}H${x + w - 6}V${y + h - 9}" stroke="var(--hazard)" stroke-width="1.5" fill="none" opacity=".7"/>` +
    (state === 'dark' ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="#000" opacity=".45"/>` : '');
}

/** Empty slot: painted floor marking. */
export function emptyPad(x: number, y: number, w: number, h: number, label: string, sel: boolean): string {
  return `<rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="6" fill="none" stroke="${sel ? 'var(--hazard)' : 'var(--floor-mark)'}" stroke-width="${sel ? 2 : 1.5}" stroke-dasharray="6 5"/>` +
    `<path d="M${x + w / 2 - 6} ${y + h / 2}h12M${x + w / 2} ${y + h / 2 - 6}v12" stroke="var(--floor-mark)" stroke-width="2"/>` +
    `<text x="${x + w / 2}" y="${y + h - 8}" text-anchor="middle" class="node-sub">${label}</text>`;
}

/** Conveyor: rails, roller bed, moving chevrons. `d` is the path. */
export function belt(d: string, id: string, stale: boolean): string {
  const c = stale ? 'var(--danger)' : 'var(--belt-rail)';
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path id="${id}" d="${d}" fill="none" stroke="url(#p-rollers)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="var(--belt-chevron)" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round" class="belt-dash${stale ? ' stale' : ''}"/>`;
}

/** Items riding a belt, following the roller path. */
export function beltItems(pathId: string, resource: ResourceId, amount: number): string {
  const n = Math.max(1, Math.min(4, Math.ceil(amount / 4)));
  const dur = 4.2;
  return Array.from({ length: n }, (_, k) =>
    `<g><animateMotion dur="${dur}s" repeatCount="indefinite" begin="${(k * (dur / n) - dur).toFixed(2)}s" rotate="0"><mpath href="#${pathId}"/></animateMotion>` +
    `<ellipse cx="0" cy="6" rx="6" ry="2" fill="#000" opacity=".35"/><g transform="translate(-8,-8)">${iconInner(resource)}</g></g>`).join('');
}

/** Stockpile rack: shelves fill with crates as stock grows, top resources shown. */
export function stockRack(s: State, x: number, y: number, w: number, h: number): string {
  const entries = (Object.keys(RESOURCES) as ResourceId[]).map(id => [id, s.res[id]] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  const cols = Math.floor((w - 16) / 20), rows = Math.floor((h - 26) / 14);
  const crates = Math.min(cols * rows, Math.ceil(total / 12));
  let out = `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 10}" rx="2" fill="var(--steel-dk)"/>`;
  for (let r = 0; r < rows; r++) out += `<rect x="${x + 6}" y="${y + 22 + r * 14}" width="${w - 12}" height="2" fill="var(--steel-lt)"/>`;
  for (let i = 0; i < crates; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const cx = x + 10 + col * 20, cy = y + h - 18 - row * 14;
    out += `<rect x="${cx}" y="${cy}" width="16" height="11" rx="1.5" fill="var(--copper)"/><path d="M${cx} ${cy + 6}h16" stroke="var(--brick-dk)" stroke-width="1.5"/><rect x="${cx + 6}" y="${cy + 2}" width="4" height="8" fill="var(--brick-dk)"/>`;
  }
  const top = entries.slice(0, Math.max(3, Math.floor((w - 12) / 36)));
  out += top.map(([id, n], i) => `<g transform="translate(${x + 9 + i * 36},${y + 7})"><g transform="scale(.7)">${iconInner(id)}</g><text x="13" y="9" class="node-sub" style="font-size:9px">${n}</text></g>`).join('');
  return out;
}
