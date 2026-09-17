/**
 * Defence art, pass 2. Top-down. Turrets are a base + a `.barrel` group the
 * screen rotates; each barrel has a `.muzzle`. Raiders are a `.walker` group
 * with limbs the walk cycle moves. Tiles are 52×52.
 */
import type { RaiderType, TurretId } from '../engine';

export const CELL = 52;
const V = { steel: 'var(--steel)', dk: 'var(--steel-dk)', lt: 'var(--steel-lt)', brick: 'var(--brick)', brickDk: 'var(--brick-dk)', hazard: 'var(--hazard)', ember: 'var(--ember)', flame: 'var(--flame)', copper: 'var(--copper)', brass: '#C9A43B', ink: '#1a1a1a', pad: 'var(--pad)', padEdge: 'var(--pad-edge)', danger: 'var(--danger)' };

// ---------------------------------------------------------------- tiles
export const fieldTile = (x: number, y: number, seed: number) => {
  const r = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280;
  const tufts = [0, 1, 2].map(i => { const tx = x + 6 + r(i) * 40, ty = y + 6 + r(i + 5) * 40; return `<path d="M${tx} ${ty} l-2 -5 M${tx} ${ty} l1 -6 M${tx} ${ty} l3 -4" stroke="#3E4A2C" stroke-width="1.2" stroke-linecap="round"/>`; }).join('');
  const rock = r(9) > 0.6 ? `<ellipse cx="${x + 10 + r(3) * 30}" cy="${y + 10 + r(4) * 30}" rx="4" ry="2.5" fill="#3A342D"/>` : '';
  return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="var(--dirt)"/>${tufts}${rock}`;
};
export const roadTile = (x: number, y: number, dir: 'v' | 'h' | 'c', seed: number) => {
  const r = (n: number) => ((seed * 7919 + n * 104729) % 233280) / 233280;
  const ruts = dir === 'h'
    ? `<path d="M${x} ${y + 18} h${CELL} M${x} ${y + 34} h${CELL}" stroke="var(--road-rut)" stroke-width="2.5" stroke-dasharray="7 4"/>`
    : dir === 'v' ? `<path d="M${x + 18} ${y} v${CELL} M${x + 34} ${y} v${CELL}" stroke="var(--road-rut)" stroke-width="2.5" stroke-dasharray="7 4"/>` : '';
  const puddle = r(2) > 0.7 ? `<ellipse cx="${x + 14 + r(3) * 24}" cy="${y + 14 + r(4) * 24}" rx="7" ry="3.5" fill="#2B2F33" opacity=".8"/>` : '';
  const prints = `<circle cx="${x + 8 + r(5) * 36}" cy="${y + 8 + r(6) * 36}" r="1.4" fill="var(--road-rut)"/><circle cx="${x + 8 + r(7) * 36}" cy="${y + 8 + r(8) * 36}" r="1.2" fill="var(--road-rut)"/>`;
  return `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="var(--road)"/>${ruts}${puddle}${prints}`;
};
export const wallTile = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="url(#p-brick)"/><rect x="${x}" y="${y}" width="${CELL}" height="8" fill="var(--wall-top)"/>` +
  `<rect x="${x + 4}" y="${y + 2}" width="10" height="6" fill="var(--wall-top)"/><rect x="${x + 21}" y="${y + 2}" width="10" height="6" fill="var(--wall-top)"/><rect x="${x + 38}" y="${y + 2}" width="10" height="6" fill="var(--wall-top)"/>` +
  `<rect x="${x}" y="${y + 8}" width="${CELL}" height="3" fill="#000" opacity=".3"/>`;
export const gateTile = (x: number, y: number, hpFrac: number) =>
  `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="url(#p-brick)"/>` +
  `<rect x="${x + 6}" y="${y + 2}" width="${CELL - 12}" height="${CELL - 4}" rx="2" fill="${V.dk}"/><rect x="${x + 8}" y="${y + 4}" width="${CELL - 16}" height="${CELL - 8}" rx="1" fill="${V.steel}"/>` +
  `<path d="M${x + CELL / 2} ${y + 6}v${CELL - 12}" stroke="${V.dk}" stroke-width="3"/>` +
  `<rect x="${x + 6}" y="${y + 2}" width="${CELL - 12}" height="4" fill="url(#p-hazard)"/><rect x="${x + 6}" y="${y + CELL - 6}" width="${CELL - 12}" height="4" fill="url(#p-hazard)"/>` +
  `<circle cx="${x + CELL / 2 - 6}" cy="${y + CELL / 2}" r="2" fill="${V.dk}"/><circle cx="${x + CELL / 2 + 6}" cy="${y + CELL / 2}" r="2" fill="${V.dk}"/>` +
  (hpFrac >= 0 ? `<rect x="${x + 10}" y="${y + CELL / 2 + 8}" width="${CELL - 20}" height="5" fill="var(--bg)"/><rect class="gate-hp" x="${x + 10}" y="${y + CELL / 2 + 8}" width="${(CELL - 20) * Math.max(0, hpFrac)}" height="5" fill="var(--ok)"/>` : '');

export const barricadeTop = (x: number, y: number, hpFrac: number) =>
  `<g transform="translate(${x},${y})"><path d="M8 16 L44 36 M8 36 L44 16" stroke="${V.brickDk}" stroke-width="6" stroke-linecap="round"/><path d="M8 16 L44 36 M8 36 L44 16" stroke="${V.copper}" stroke-width="3" stroke-linecap="round"/>` +
  `<rect x="20" y="10" width="12" height="32" rx="2" fill="${V.dk}"/><path d="M22 14h8M22 38h8" stroke="${V.hazard}" stroke-width="2"/>` +
  `<rect x="10" y="44" width="32" height="4" fill="var(--bg)"/><rect x="10" y="44" width="${32 * Math.max(0, hpFrac)}" height="4" fill="${V.hazard}"/></g>`;

// ---------------------------------------------------------------- turrets (barrel points +x before rotation)
const base = `<circle r="20" fill="${V.pad}" stroke="${V.padEdge}"/><path d="M-20 0 A20 20 0 0 1 20 0" fill="none" stroke="${V.hazard}" stroke-width="1.5" stroke-dasharray="3 5" opacity=".6"/><circle r="14" fill="${V.dk}"/><circle r="11" fill="${V.steel}"/><circle r="11" fill="none" stroke="${V.lt}" stroke-width="1" opacity=".5"/>`;
const lamp = `<circle class="t-lamp" cx="-14" cy="-14" r="3" fill="${V.danger}"/>`;
/** Muzzle flash: an outer group carries the position (SVG attribute), the inner group is what CSS animates. */
const muzzle = (x: number, y = 0, kind: 'flash' | 'cone' | 'debris' = 'flash') => {
  const inner = kind === 'cone' ? `<path d="M0 -3 L16 -11 L18 0 L16 11 L0 3Z" fill="${V.flame}" opacity=".85"/><circle r="3" fill="#fff"/>`
    : kind === 'debris' ? `<circle r="3" fill="#fff"/><circle cx="8" cy="-4" r="1.6" fill="#B8703F"/><circle cx="11" cy="2" r="1.4" fill="${V.dk}"/><circle cx="7" cy="5" r="1.2" fill="#B8703F"/><path d="M0 0 L12 -6 M0 0 L13 3" stroke="${V.flame}" stroke-width="1.5"/>`
    : `<path d="M0 0 L11 -6 L8 0 L11 6Z" fill="${V.flame}"/><circle r="3" fill="#fff"/>`;
  return `<g transform="translate(${x},${y})"><g class="muzzle">${inner}</g></g>`;
};
/** Rotating barrel cluster seen from above: three rods that roll past each other. */
const cluster = (x: number, len: number, y = 0, gap = 4) =>
  `<g transform="translate(${x},${y})" style="--g:${gap}px">` +
  `<rect x="0" y="${-gap - 2}" width="${len}" height="${gap * 2 + 4}" rx="2" fill="${V.dk}"/>` +
  [0, 1, 2, 3].map(i => `<g class="rod" style="animation-delay:-${(i * 0.125).toFixed(3)}s"><rect x="1" y="-1.5" width="${len - 2}" height="3" rx="1.2" fill="${V.lt}"/></g>`).join('') +
  `<rect x="${len - 5}" y="${-gap - 3}" width="4" height="${gap * 2 + 6}" rx="1" fill="${V.dk}"/><rect x="${len - 5}" y="${-gap - 3}" width="4" height="${gap * 2 + 6}" rx="1" fill="${V.dk}"/></g>`;

const BARRELS: Record<TurretId, string> = {
  // crude mortar: a fat short tube with a scrap hopper bolted on
  scrap_launcher: `<rect x="-9" y="-6" width="10" height="12" rx="2" fill="${V.brickDk}"/><rect x="-1" y="-6" width="18" height="12" rx="3" fill="${V.brick}"/><rect x="13" y="-7" width="5" height="14" rx="1" fill="${V.brickDk}"/><circle cx="17" cy="0" r="4.5" fill="${V.ink}"/><circle cx="17" cy="0" r="2.5" fill="#B8703F"/><rect x="-4" y="6" width="10" height="7" rx="1" fill="${V.dk}"/><circle cx="-1" cy="9" r="1.4" fill="#B8703F"/><circle cx="3" cy="10" r="1.2" fill="#B8703F"/>${muzzle(19, 0, 'debris')}`,
  // stubby side-by-side shotgun with a wooden stock and a wide spread
  shotgun: `<rect x="-13" y="-5" width="10" height="10" rx="2" fill="${V.copper}"/><rect x="-4" y="-6" width="8" height="12" rx="1" fill="${V.dk}"/><rect x="3" y="-6.5" width="13" height="6" rx="2" fill="${V.lt}"/><rect x="3" y="0.5" width="13" height="6" rx="2" fill="${V.lt}"/><circle cx="16" cy="-3.5" r="2.4" fill="${V.ink}"/><circle cx="16" cy="3.5" r="2.4" fill="${V.ink}"/><rect x="0" y="-8" width="3" height="16" fill="${V.brass}"/>${muzzle(17, 0, 'cone')}`,
  assault_rifle: `<rect x="-9" y="-5" width="10" height="10" rx="2" fill="${V.dk}"/><rect x="0" y="-2.5" width="28" height="5" rx="1" fill="${V.lt}"/><rect x="8" y="2" width="6" height="8" rx="1" fill="${V.dk}"/><rect x="18" y="-4.5" width="7" height="9" rx="1" fill="${V.dk}"/><rect x="-4" y="-8" width="6" height="3" fill="${V.hazard}"/>${muzzle(28)}`,
  minigun: `<rect x="-11" y="-8" width="14" height="16" rx="3" fill="${V.dk}"/><rect x="-8" y="8" width="9" height="5" fill="${V.brass}"/>${cluster(3, 24)}<circle cx="1" cy="0" r="5" fill="${V.dk}"/>${muzzle(28)}`,
  double_minigun: `<rect x="-12" y="-12" width="15" height="24" rx="3" fill="${V.dk}"/><rect x="-8" y="12" width="10" height="5" fill="${V.brass}"/>${cluster(3, 24, -6, 3)}${cluster(3, 24, 6, 3)}<circle cx="1" cy="-6" r="4" fill="${V.dk}"/><circle cx="1" cy="6" r="4" fill="${V.dk}"/><rect x="-12" y="-13" width="15" height="2" fill="${V.hazard}"/><rect x="-12" y="11" width="15" height="2" fill="${V.hazard}"/>${muzzle(28, -6)}${muzzle(28, 6)}`,
};
export function turretTop(id: TurretId, x: number, y: number, angleDeg: number, state: 'idle' | 'track' | 'fire' | 'dry' = 'idle'): string {
  return `<g class="turret t-${state}" transform="translate(${x + CELL / 2},${y + CELL / 2})">${base}${lamp}<g class="barrel" style="transform:rotate(${angleDeg}deg)"><g class="recoil">${BARRELS[id]}</g></g></g>`;
}

// ---------------------------------------------------------------- raiders (facing +y = down the road)
export function raiderTop(type: RaiderType, x: number, y: number, hpFrac: number): string {
  const w = type === 'brute' ? 30 : 20;
  const body = (() => {
    switch (type) {
      case 'scrapper': return `<g class="legs"><rect class="leg l" x="-6" y="4" width="4" height="9" rx="2" fill="#4B3A2E"/><rect class="leg r" x="2" y="4" width="4" height="9" rx="2" fill="#4B3A2E"/></g>` +
        `<rect x="-8" y="-6" width="16" height="14" rx="4" fill="#6E3B2C"/><rect x="-8" y="-1" width="16" height="3" fill="#3A2A20"/>` +
        `<g class="arm r"><rect x="7" y="-4" width="4" height="12" rx="2" fill="#C98B5A"/><rect x="8" y="6" width="3" height="14" fill="${V.dk}"/></g><g class="arm l"><rect x="-11" y="-4" width="4" height="10" rx="2" fill="#C98B5A"/></g>` +
        `<circle r="6" cy="-4" fill="#C98B5A"/><path d="M-6 -6 Q0 -10 6 -6" stroke="#3A2A20" stroke-width="3" fill="none"/>`;
      case 'runner': return `<g class="legs"><rect class="leg l" x="-5" y="4" width="3" height="11" rx="1.5" fill="#2A2A30"/><rect class="leg r" x="2" y="4" width="3" height="11" rx="1.5" fill="#2A2A30"/></g>` +
        `<ellipse rx="6" ry="9" cy="0" fill="#4A4A55"/><path d="M-6 -2 L-13 -12 M6 -2 L13 -12" stroke="#4A4A55" stroke-width="3" stroke-linecap="round"/>` +
        `<circle r="5" cy="-5" fill="#E0AC85"/><rect x="-5" y="-9" width="10" height="3" fill="#D9534F"/>`;
      case 'brute': return `<g class="legs"><rect class="leg l" x="-10" y="8" width="6" height="12" rx="2" fill="#1F261C"/><rect class="leg r" x="4" y="8" width="6" height="12" rx="2" fill="#1F261C"/></g>` +
        `<rect x="-13" y="-10" width="26" height="22" rx="6" fill="#2E3A2A"/><rect x="-13" y="-4" width="26" height="4" fill="${V.dk}"/><rect x="-10" y="4" width="20" height="3" fill="${V.dk}"/>` +
        `<g class="arm r"><rect x="12" y="-8" width="6" height="16" rx="3" fill="#8D5A3C"/><rect x="13" y="6" width="5" height="18" fill="${V.dk}"/><rect x="11" y="22" width="9" height="6" fill="${V.dk}"/></g><g class="arm l"><rect x="-18" y="-8" width="6" height="14" rx="3" fill="#8D5A3C"/><rect x="-24" y="-10" width="10" height="18" rx="2" fill="${V.steel}"/></g>` +
        `<circle r="8" cy="-6" fill="#8D5A3C"/><path d="M-8 -8 A8 8 0 0 1 8 -8 L8 -5 L-8 -5Z" fill="${V.dk}"/>`;
    }
  })();
  return `<g class="raider walker ${type}" transform="translate(${x},${y})"><ellipse cy="14" rx="${w / 2}" ry="4" fill="#000" opacity=".35"/><g class="bob">${body}</g>` +
    `<rect x="${-w / 2}" y="${-w / 2 - 10}" width="${w}" height="3" fill="var(--bg)"/><rect class="hp" x="${-w / 2}" y="${-w / 2 - 10}" width="${w * Math.max(0, hpFrac)}" height="3" fill="${V.danger}"/></g>`;
}

export const DEFENCE_CSS = `
@keyframes t-sweep { 0%,100% { transform:rotate(calc(var(--a) - 14deg)) } 50% { transform:rotate(calc(var(--a) + 14deg)) } }
@keyframes t-recoil { 0% { transform:translateX(0) } 15% { transform:translateX(-4px) } 100% { transform:translateX(0) } }
@keyframes t-flash { 0% { opacity:1; transform:scale(1.25) } 100% { opacity:0; transform:scale(.7) } }
@keyframes roll { 0% { transform:translateY(calc(var(--g) * -1)); opacity:0 } 15% { opacity:.55 } 50% { transform:translateY(0); opacity:1 } 85% { opacity:.55 } 100% { transform:translateY(var(--g)); opacity:0 } }
@keyframes t-spin { to { transform:rotate(360deg) } }
@keyframes t-lamp { 0%,100% { opacity:.35 } 50% { opacity:1 } }
@keyframes shell { 0% { opacity:1; transform:translate(0,0) rotate(0) } 100% { opacity:0; transform:translate(-10px,14px) rotate(160deg) } }
@keyframes walk-l { 0%,100% { transform:translateY(-2px) } 50% { transform:translateY(2px) } }
@keyframes walk-r { 0%,100% { transform:translateY(2px) } 50% { transform:translateY(-2px) } }
@keyframes bob { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-1px) } }
@keyframes arm-l { 0%,100% { transform:rotate(7deg) } 50% { transform:rotate(-7deg) } }
@keyframes arm-r { 0%,100% { transform:rotate(-7deg) } 50% { transform:rotate(7deg) } }
@keyframes hit { 0% { filter:brightness(2.5) } 100% { filter:brightness(1) } }
@keyframes die { 0% { opacity:1; transform:rotate(0) scale(1) } 100% { opacity:0; transform:rotate(80deg) scale(.7) } }

.turret .muzzle { opacity:0; transform-box:fill-box; transform-origin:center }
.turret .t-lamp { opacity:0 }
.turret.t-idle .barrel { animation:t-sweep 6s ease-in-out infinite }
.turret.t-track .barrel { transition:transform .35s ease-out }
.turret.t-fire .recoil { animation:t-recoil .25s ease-out }
.turret.t-fire .muzzle { animation:t-flash .22s ease-out }
.turret .rod { opacity:0 }
.turret .rod:nth-child(2) { opacity:.55; transform:translateY(calc(var(--g) * -.5)) } .turret .rod:nth-child(4) { opacity:.55; transform:translateY(calc(var(--g) * .5)) } .turret .rod:nth-child(3) { opacity:1 }
.turret.t-fire .rod, .turret.t-track .rod { animation:roll .5s linear infinite }
.turret.t-dry .barrel { transform:rotate(calc(var(--a) + 22deg)) !important; filter:saturate(.4) }
.turret.t-dry .t-lamp { opacity:1; animation:t-lamp 1.6s ease-in-out infinite }
.turret .shell { opacity:0 } .turret.t-fire .shell { animation:shell .6s ease-out forwards }

.walker .leg.l { animation:walk-l var(--step,.5s) ease-in-out infinite; transform-box:fill-box; transform-origin:center }
.walker .leg.r { animation:walk-r var(--step,.5s) ease-in-out infinite; transform-box:fill-box; transform-origin:center }
.walker .bob { animation:bob var(--step,.5s) ease-in-out infinite }
.walker .arm.l { animation:arm-l var(--step,.5s) ease-in-out infinite; transform-box:fill-box; transform-origin:top center }
.walker .arm.r { animation:arm-r var(--step,.5s) ease-in-out infinite; transform-box:fill-box; transform-origin:top center }
.walker { --step:.6s } .walker.runner { --step:.34s } .walker.brute { --step:1s }
.walker.hit .bob { animation:hit .3s ease-out }
.walker.dying { animation:die .55s ease-in forwards; transform-box:fill-box; transform-origin:center }
.walker.still .leg, .walker.still .arm, .walker.still .bob { animation:none }
`;
