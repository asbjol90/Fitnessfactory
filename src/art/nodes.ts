/**
 * Factory node art. Each function returns SVG markup for a 96×64 box at (0,0);
 * the caller wraps it in <g transform>. Idle animations are CSS classes
 * (see styles.css `.anim-*`) so they run without JS and respect reduced-motion.
 */
import type { BuildingId, TurretId } from '../engine';

const P = {
  steel: 'var(--steel)', steelDk: 'var(--steel-dk)', steelLt: 'var(--steel-lt)',
  brick: 'var(--brick)', brickDk: 'var(--brick-dk)', hazard: 'var(--hazard)',
  ember: 'var(--ember)', flame: 'var(--flame)', smoke: 'var(--smoke)', ink: 'var(--line)',
  glass: 'var(--glass)', copper: 'var(--copper)',
};

const smoke = (x: number, y: number, delay = 0) =>
  `<g class="anim-smoke" style="animation-delay:${delay}s"><circle cx="${x}" cy="${y}" r="4" fill="${P.smoke}" opacity=".7"/></g>`;
const ground = `<rect x="4" y="54" width="88" height="6" rx="2" fill="${P.steelDk}"/>`;

import { MACHINES } from './machines';
const MACHINE_BY_ID = new Map(MACHINES.map(m => [m.id, m.draw]));
export const buildingArt = (id: BuildingId, upgrade: string | null) =>
  (MACHINE_BY_ID.get(upgrade ? `${id}:${upgrade}` : id) ?? MACHINE_BY_ID.get(id) ?? (() => ''))();
/** Roof solar panel, drawn small. */
export const solarArt = () => MACHINE_BY_ID.get('solar_panel')!();

// ---------------------------------------------------------------- Turrets
const mount = `${ground}<path d="M30 54 L38 34 L58 34 L66 54Z" fill="${P.steelDk}"/><rect x="26" y="50" width="44" height="6" rx="2" fill="${P.steel}"/><circle cx="48" cy="34" r="9" fill="${P.steel}"/><circle cx="48" cy="34" r="4" fill="${P.steelDk}"/>`;
const muzzle = (x: number, y: number) => `<g class="muzzle" transform="translate(${x},${y})"><path d="M0 0 L10 -5 L7 0 L10 5Z" fill="${P.flame}" opacity="0"/></g>`;
const TURRET_ART: Record<TurretId, () => string> = {
  scrap_launcher: () => `${mount}<path d="M46 32 L82 14 L86 20 L52 40Z" fill="${P.brick}"/><path d="M78 12 L90 8 L88 18Z" fill="${P.brickDk}"/><rect x="40" y="24" width="12" height="10" rx="2" fill="${P.brickDk}"/><circle cx="46" cy="29" r="3" fill="${P.ember}"/>${muzzle(88, 12)}`,
  shotgun: () => `${mount}<rect x="48" y="26" width="38" height="6" rx="2" fill="${P.steelLt}"/><rect x="48" y="34" width="38" height="6" rx="2" fill="${P.steelLt}"/><rect x="40" y="22" width="16" height="22" rx="3" fill="${P.steelDk}"/><rect x="62" y="24" width="4" height="18" fill="${P.copper}"/>${muzzle(88, 33)}`,
  assault_rifle: () => `${mount}<rect x="46" y="28" width="44" height="7" rx="2" fill="${P.steelLt}"/><rect x="72" y="26" width="10" height="11" rx="1" fill="${P.steelDk}"/><rect x="58" y="35" width="8" height="12" rx="2" fill="${P.steelDk}"/><rect x="38" y="22" width="16" height="18" rx="3" fill="${P.steelDk}"/><rect x="44" y="16" width="8" height="8" rx="1" fill="${P.hazard}"/>${muzzle(92, 31)}`,
  minigun: () => `${mount}<rect x="34" y="22" width="20" height="22" rx="4" fill="${P.steelDk}"/><g class="anim-spin" style="transform-origin:44px 33px"><circle cx="44" cy="33" r="8" fill="${P.steel}"/><circle cx="44" cy="27" r="2" fill="${P.steelLt}"/><circle cx="44" cy="39" r="2" fill="${P.steelLt}"/><circle cx="38" cy="33" r="2" fill="${P.steelLt}"/><circle cx="50" cy="33" r="2" fill="${P.steelLt}"/></g><rect x="52" y="26" width="40" height="3" fill="${P.steelLt}"/><rect x="52" y="31" width="40" height="3" fill="${P.steelLt}"/><rect x="52" y="36" width="40" height="3" fill="${P.steelLt}"/><rect x="82" y="24" width="6" height="18" rx="1" fill="${P.steelDk}"/>${muzzle(92, 32)}`,
  double_minigun: () => `${mount}<rect x="30" y="16" width="24" height="34" rx="4" fill="${P.steelDk}"/><g class="anim-spin" style="transform-origin:42px 26px"><circle cx="42" cy="26" r="6" fill="${P.steel}"/><circle cx="42" cy="22" r="1.5" fill="${P.hazard}"/><circle cx="42" cy="30" r="1.5" fill="${P.hazard}"/></g><g class="anim-spin" style="transform-origin:42px 42px"><circle cx="42" cy="42" r="6" fill="${P.steel}"/><circle cx="42" cy="38" r="1.5" fill="${P.hazard}"/><circle cx="42" cy="46" r="1.5" fill="${P.hazard}"/></g><rect x="50" y="22" width="42" height="3" fill="${P.hazard}"/><rect x="50" y="27" width="42" height="3" fill="${P.steelLt}"/><rect x="50" y="38" width="42" height="3" fill="${P.hazard}"/><rect x="50" y="43" width="42" height="3" fill="${P.steelLt}"/><rect x="84" y="20" width="6" height="26" rx="1" fill="${P.steelDk}"/>${muzzle(92, 25)}${muzzle(92, 41)}`,
};
export const turretArt = (id: TurretId) => TURRET_ART[id]();

// ---------------------------------------------------------------- Fixed nodes
export const stockArt = () => `
${ground}
<rect x="20" y="34" width="26" height="20" rx="2" fill="${P.copper}"/><rect x="50" y="34" width="26" height="20" rx="2" fill="${P.copper}"/>
<rect x="35" y="14" width="26" height="20" rx="2" fill="${P.copper}"/>
<path d="M20 44h26M50 44h26M35 24h26" stroke="${P.brickDk}" stroke-width="2"/>
<rect x="30" y="38" width="6" height="12" fill="${P.brickDk}"/><rect x="60" y="38" width="6" height="12" fill="${P.brickDk}"/><rect x="45" y="18" width="6" height="12" fill="${P.brickDk}"/>`;

export const traderArt = () => `
${ground}
<rect x="14" y="30" width="68" height="24" rx="3" fill="${P.steel}"/>
<path d="M10 30 L20 18 L76 18 L86 30Z" fill="${P.hazard}"/><path d="M20 18 L30 30 M40 18 L44 30 M56 18 L52 30 M76 18 L66 30" stroke="${P.steelDk}" stroke-width="2"/>
<rect x="22" y="36" width="20" height="12" rx="2" fill="${P.glass}"/><circle cx="66" cy="42" r="6" fill="${P.hazard}"/><text x="66" y="45" font-size="8" text-anchor="middle" fill="${P.steelDk}" font-weight="700">$</text>`;

export const raidArt = (mode: 'quiet' | 'repelled' | 'breach') => {
  const c = mode === 'quiet' ? P.smoke : mode === 'repelled' ? 'var(--ok)' : 'var(--danger)';
  return `
<rect x="10" y="12" width="76" height="42" rx="6" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="${mode === 'quiet' ? '5 4' : '0'}"/>
<path d="M48 18 C38 18 32 26 32 34 C32 40 36 44 40 46 L40 50 L56 50 L56 46 C60 44 64 40 64 34 C64 26 58 18 48 18Z" fill="${c}"/>
<circle cx="42" cy="34" r="4" fill="var(--bg)"/><circle cx="54" cy="34" r="4" fill="var(--bg)"/><rect x="45" y="41" width="6" height="5" fill="var(--bg)"/>`;
};

// ---------------------------------------------------------------- Resource icons (16×16)
type IconId = 'ore' | 'coal' | 'stone' | 'gem' | 'ingot' | 'gravel' | 'coke' | 'tar' | 'gear' | 'alloy' | 'ring' | 'crown' | 'steel' | 'flask' | 'round';
const ICON: Record<IconId, (c: string) => string> = {
  ore: c => `<path d="M3 12 L6 5 L11 4 L14 9 L12 13 L5 14Z" fill="${c}"/><path d="M6 5 L9 8 L12 13" stroke="#000" stroke-opacity=".25" stroke-width="1.2" fill="none"/>`,
  coal: c => `<path d="M2 10 L5 4 L11 3 L14 8 L11 13 L4 13Z" fill="${c}"/>`,
  stone: c => `<path d="M2 11 L4 6 L12 5 L14 10 L11 13 L4 13Z" fill="${c}"/>`,
  gem: c => `<path d="M8 2 L14 7 L8 14 L2 7Z" fill="${c}"/><path d="M8 2 L14 7 L8 7Z" fill="#fff" fill-opacity=".45"/>`,
  ingot: c => `<path d="M2 12 L4 6 L12 6 L14 12Z" fill="${c}"/><path d="M4 6 L12 6 L11 8 L5 8Z" fill="#fff" fill-opacity=".3"/>`,
  gravel: c => `<circle cx="4" cy="11" r="2.5" fill="${c}"/><circle cx="9" cy="6" r="2.5" fill="${c}"/><circle cx="12" cy="12" r="2.5" fill="${c}"/>`,
  coke: c => `<path d="M3 11 L5 5 L10 3 L13 7 L12 12 L6 14Z" fill="${c}"/><circle cx="8" cy="8" r="2" fill="#fff" fill-opacity=".25"/>`,
  tar: c => `<path d="M8 2 C8 2 3 8 3 11 A5 5 0 0 0 13 11 C13 8 8 2 8 2Z" fill="${c}"/>`,
  gear: c => `<path d="M8 1 L9.5 3 L12 2.5 L12.5 5 L15 6 L14 8 L15 10 L12.5 11 L12 13.5 L9.5 13 L8 15 L6.5 13 L4 13.5 L3.5 11 L1 10 L2 8 L1 6 L3.5 5 L4 2.5 L6.5 3Z" fill="${c}"/><circle cx="8" cy="8" r="2.5" fill="var(--bg)"/>`,
  alloy: c => `<rect x="2" y="4" width="12" height="8" rx="1" fill="${c}"/><path d="M2 8h12" stroke="#fff" stroke-opacity=".35"/>`,
  ring: c => `<circle cx="8" cy="9" r="4.5" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M8 2 L10 4.5 L8 6 L6 4.5Z" fill="#dff"/>`,
  crown: c => `<path d="M2 12 L3 5 L6 8 L8 3 L10 8 L13 5 L14 12Z" fill="${c}"/><rect x="2" y="12" width="12" height="2" fill="${c}"/>`,
  steel: c => `<path d="M3 4 L13 4 L11 12 L5 12Z" fill="${c}"/><path d="M5 6h6" stroke="#fff" stroke-opacity=".4"/>`,
  flask: c => `<path d="M6 2h4v4l3 6a1 1 0 0 1-1 2H4a1 1 0 0 1-1-2l3-6Z" fill="${c}"/>`,
  round: c => `<path d="M5 6 C5 3 11 3 11 6 L11 14 L5 14Z" fill="${c}"/><rect x="5" y="10" width="6" height="2" fill="#000" fill-opacity=".3"/>`,
};
export const RESOURCE_ICON: Record<string, [IconId, string]> = {
  iron_ore: ['ore', '#B8703F'], coal: ['coal', '#3A3F47'], stone: ['stone', '#8E97A3'],
  silver: ['gem', '#C9D6E2'], gold_ore: ['gem', '#F2C94C'], diamond: ['gem', '#7FE0F5'],
  hardened_steel: ['steel', '#7B8FA6'], iron: ['ingot', '#9AA7B5'], gravel: ['gravel', '#A39A8E'],
  coke: ['coke', '#5C6470'], coal_tar: ['tar', '#2B2F36'], refined_silver: ['ingot', '#DCE6F0'],
  gold_bullion: ['ingot', '#F2C94C'], precision_components: ['gear', '#B8C4D2'], cut_diamond: ['gem', '#A8F0FF'],
  refined_catalyst: ['flask', '#9CD64A'], reinforced_alloy: ['alloy', '#6FA3D6'], master_jewelry: ['ring', '#F2C94C'],
  masterwork_gear: ['crown', '#FFD86B'],
  cartridges: ['round', '#C9A43B'], hardened_rounds: ['round', '#8FA3B8'], alloy_rounds: ['round', '#6FA3D6'],
  research: ['flask', '#B48CF2'], gold: ['ingot', '#F2C94C'],
};
export function iconSvg(res: string, size = 16): string {
  const [kind, color] = RESOURCE_ICON[res] ?? ['stone', '#888'];
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">${ICON[kind](color)}</svg>`;
}
/** Icon markup without the outer svg — for embedding inside another svg. */
export function iconInner(res: string): string {
  const [kind, color] = RESOURCE_ICON[res] ?? ['stone', '#888'];
  return ICON[kind](color);
}
