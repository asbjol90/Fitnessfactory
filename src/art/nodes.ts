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

const furnace = () => `
${ground}
<rect x="18" y="20" width="52" height="36" rx="3" fill="${P.brick}"/>
<rect x="18" y="20" width="52" height="6" fill="${P.brickDk}"/>
<rect x="24" y="8" width="10" height="16" fill="${P.steel}"/><rect x="22" y="6" width="14" height="4" fill="${P.steelDk}"/>
<rect x="34" y="34" width="20" height="14" rx="2" fill="${P.ember}" class="anim-glow"/>
<rect x="36" y="48" width="16" height="3" fill="${P.steelDk}"/>
${smoke(29, 4)}${smoke(29, 4, 1.1)}`;

const blast = () => `
${ground}
<rect x="14" y="14" width="60" height="42" rx="4" fill="${P.steel}"/>
<rect x="14" y="14" width="60" height="8" fill="${P.steelDk}"/>
<rect x="60" y="2" width="9" height="14" fill="${P.steelDk}"/>
<rect x="22" y="30" width="14" height="20" rx="2" fill="${P.brickDk}"/>
<path d="M28 48 C22 42 26 36 29 32 C30 38 34 38 35 44 C36 48 32 50 28 48Z" fill="${P.flame}" class="anim-flame"/>
<rect x="44" y="28" width="22" height="22" rx="2" fill="${P.brick}"/>
<circle cx="55" cy="39" r="6" fill="${P.ember}" class="anim-glow"/>
${smoke(64, 0)}${smoke(64, 0, .8)}`;

const forge = () => `
${ground}
<rect x="12" y="24" width="40" height="32" rx="3" fill="${P.brick}"/>
<rect x="12" y="24" width="40" height="5" fill="${P.brickDk}"/>
<rect x="22" y="38" width="20" height="12" rx="2" fill="${P.ember}" class="anim-glow"/>
<rect x="58" y="44" width="30" height="8" rx="2" fill="${P.steelDk}"/>
<path d="M60 44 L86 44 L82 36 L64 36Z" fill="${P.steel}"/>
<g class="anim-hammer" style="transform-origin:82px 30px">
  <rect x="80" y="14" width="4" height="22" fill="${P.steelDk}"/><rect x="72" y="10" width="20" height="9" rx="2" fill="${P.steelLt}"/>
</g>`;

const crusher = () => `
${ground}
<path d="M20 56 L26 30 L70 30 L76 56Z" fill="${P.steel}"/>
<rect x="30" y="18" width="36" height="14" fill="${P.steelDk}"/>
<g class="anim-piston"><rect x="44" y="4" width="8" height="26" fill="${P.hazard}"/><rect x="38" y="26" width="20" height="8" fill="${P.steelLt}"/></g>
<circle cx="34" cy="48" r="3" fill="${P.smoke}"/><circle cx="60" cy="50" r="2.5" fill="${P.smoke}"/><circle cx="48" cy="52" r="2" fill="${P.smoke}"/>`;

const cokeOven = () => `
${ground}
<path d="M18 56 C18 26 32 14 48 14 C64 14 78 26 78 56Z" fill="${P.brick}"/>
<path d="M28 56 C28 34 38 26 48 26 C58 26 68 34 68 56Z" fill="${P.brickDk}"/>
<rect x="38" y="38" width="20" height="18" rx="2" fill="${P.ember}" class="anim-glow"/>
<rect x="44" y="6" width="8" height="12" fill="${P.steel}"/>
${smoke(48, 2)}${smoke(48, 2, 1.4)}`;

const chemical = () => `
${ground}
<rect x="12" y="22" width="22" height="34" rx="6" fill="${P.steel}"/><rect x="62" y="16" width="22" height="40" rx="6" fill="${P.steel}"/>
<rect x="34" y="34" width="28" height="6" fill="${P.copper}"/><rect x="40" y="18" width="14" height="38" rx="3" fill="${P.glass}"/>
<g class="anim-bubble"><circle cx="45" cy="50" r="2" fill="${P.hazard}"/><circle cx="50" cy="46" r="1.5" fill="${P.hazard}"/></g>
<rect x="16" y="26" width="14" height="4" fill="${P.hazard}"/>`;

const refinery = () => `
${ground}
<rect x="14" y="10" width="12" height="46" rx="3" fill="${P.steel}"/><rect x="30" y="20" width="12" height="36" rx="3" fill="${P.steel}"/>
<rect x="46" y="30" width="34" height="26" rx="3" fill="${P.steelDk}"/>
<rect x="46" y="30" width="34" height="5" fill="${P.copper}"/>
<rect x="76" y="4" width="4" height="30" fill="${P.steelDk}"/>
<path d="M78 4 C74 0 76 -4 78 -6 C80 -3 82 0 78 4Z" fill="${P.flame}" class="anim-flame"/>
<rect x="18" y="14" width="4" height="30" fill="${P.hazard}" opacity=".6"/>`;

const lapidary = () => `
${ground}
<rect x="14" y="40" width="68" height="14" rx="3" fill="${P.steelDk}"/>
<rect x="18" y="34" width="60" height="8" fill="${P.steel}"/>
<path d="M48 12 L62 26 L48 40 L34 26Z" fill="${P.glass}"/><path d="M48 12 L62 26 L48 26Z" fill="#fff" opacity=".5"/>
<g class="anim-sparkle"><path d="M70 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="${P.hazard}"/></g>`;

const foundry = () => `
${ground}
<rect x="12" y="16" width="30" height="40" rx="3" fill="${P.brick}"/><rect x="12" y="16" width="30" height="5" fill="${P.brickDk}"/>
<g class="anim-pour" style="transform-origin:58px 30px">
  <path d="M50 22 L74 22 L70 40 L54 40Z" fill="${P.steelDk}"/><rect x="52" y="24" width="20" height="6" fill="${P.ember}" class="anim-glow"/>
</g>
<rect x="66" y="42" width="20" height="12" rx="2" fill="${P.steel}"/>
<rect x="20" y="30" width="14" height="14" rx="2" fill="${P.ember}" class="anim-glow"/>`;

const machineShop = () => `
${ground}
<rect x="10" y="38" width="76" height="16" rx="3" fill="${P.steelDk}"/>
<rect x="22" y="26" width="52" height="12" fill="${P.steel}"/>
<g class="anim-spin" style="transform-origin:34px 32px"><circle cx="34" cy="32" r="8" fill="${P.steelLt}"/><path d="M34 24 v16 M26 32 h16" stroke="${P.steelDk}" stroke-width="2"/></g>
<rect x="46" y="29" width="22" height="6" fill="${P.hazard}"/>
<rect x="60" y="10" width="8" height="16" fill="${P.steel}"/>`;

const jeweler = () => `
${ground}
<rect x="18" y="26" width="60" height="28" rx="4" fill="${P.steel}"/>
<rect x="24" y="30" width="48" height="16" rx="2" fill="${P.glass}"/>
<circle cx="48" cy="40" r="6" fill="none" stroke="${P.hazard}" stroke-width="3"/><circle cx="48" cy="33" r="2.5" fill="${P.glass}" stroke="#fff"/>
<rect x="18" y="16" width="60" height="6" rx="2" fill="${P.brick}"/>
<g class="anim-sparkle"><path d="M66 12 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5Z" fill="${P.hazard}"/></g>`;

const armory = () => `
${ground}
<rect x="14" y="16" width="68" height="40" rx="3" fill="${P.steelDk}"/>
<path d="M48 18 L64 24 L64 38 C64 48 48 54 48 54 C48 54 32 48 32 38 L32 24Z" fill="${P.steel}"/>
<path d="M48 18 L64 24 L64 38 C64 48 48 54 48 54Z" fill="${P.steelLt}" opacity=".5"/>
<rect x="46" y="24" width="4" height="22" fill="${P.hazard}"/><rect x="40" y="30" width="16" height="4" fill="${P.hazard}"/>`;

const solar = () => `
${ground}
<g class="anim-sun" style="transform-origin:78px 14px"><circle cx="78" cy="14" r="6" fill="${P.hazard}"/><path d="M78 2v4M78 22v4M66 14h4M86 14h4M69 5l3 3M84 20l3 3M87 5l-3 3M72 20l-3 3" stroke="${P.hazard}" stroke-width="2"/></g>
<path d="M18 46 L30 22 L74 22 L62 46Z" fill="${P.glass}"/>
<path d="M18 46 L30 22 L74 22 L62 46Z" fill="none" stroke="${P.steelDk}" stroke-width="2"/>
<path d="M24 34 L68 34 M40 22 L28 46 M56 22 L44 46" stroke="${P.steelDk}" stroke-width="1.5"/>
<rect x="38" y="46" width="6" height="10" fill="${P.steel}"/>`;

const BUILDING_ART: Record<BuildingId, () => string> = {
  furnace, crusher, coke_oven: cokeOven, chemical_works: chemical, refinery, lapidary, foundry,
  machine_shop: machineShop, jeweler, armory, solar_panel: solar,
};
const UPGRADE_ART: Record<string, () => string> = {
  'furnace:blast': blast, 'furnace:forge': forge,
  'crusher:hydraulic': () => crusher().replace(P.hazard, P.glass),
  'crusher:sifting': () => crusher() + `<rect x="24" y="34" width="48" height="3" fill="${P.hazard}" opacity=".8"/>`,
  'coke_oven:industrial': () => cokeOven().replace(`<rect x="44" y="6" width="8" height="12"`, `<rect x="40" y="0" width="16" height="18"`),
  'coke_oven:byproduct': () => cokeOven() + `<rect x="74" y="40" width="12" height="14" rx="2" fill="${P.steelDk}"/><circle cx="80" cy="47" r="3" fill="${P.ink}"/>`,
};
export const buildingArt = (id: BuildingId, upgrade: string | null) =>
  (upgrade && UPGRADE_ART[`${id}:${upgrade}`]) ? UPGRADE_ART[`${id}:${upgrade}`]!() : BUILDING_ART[id]();

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
type IconId = 'ore' | 'coal' | 'stone' | 'gem' | 'ingot' | 'gravel' | 'coke' | 'tar' | 'gear' | 'alloy' | 'ring' | 'crown' | 'steel' | 'flask';
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
};
export const RESOURCE_ICON: Record<string, [IconId, string]> = {
  iron_ore: ['ore', '#B8703F'], coal: ['coal', '#3A3F47'], stone: ['stone', '#8E97A3'],
  silver: ['gem', '#C9D6E2'], gold_ore: ['gem', '#F2C94C'], diamond: ['gem', '#7FE0F5'],
  hardened_steel: ['steel', '#7B8FA6'], iron: ['ingot', '#9AA7B5'], gravel: ['gravel', '#A39A8E'],
  coke: ['coke', '#5C6470'], coal_tar: ['tar', '#2B2F36'], refined_silver: ['ingot', '#DCE6F0'],
  gold_bullion: ['ingot', '#F2C94C'], precision_components: ['gear', '#B8C4D2'], cut_diamond: ['gem', '#A8F0FF'],
  refined_catalyst: ['flask', '#9CD64A'], reinforced_alloy: ['alloy', '#6FA3D6'], master_jewelry: ['ring', '#F2C94C'],
  masterwork_gear: ['crown', '#FFD86B'],
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
