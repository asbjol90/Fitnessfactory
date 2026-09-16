/**
 * Avatar art, layered in code. Draw order (back → front):
 *   power cells (backpack) → body → base outfit → work tools → field armor → scholar's kit → head gear
 * Each gear axis has 4 tier pieces; tier N shows pieces 1..N, so every 4-axis
 * combination (625 per character) renders without any hand-drawn variants.
 * Canvas is 120×180.
 */
import type { AvatarId, StatId } from '../engine';

interface Look {
  skin: string; hair: string; hairStyle: 'short' | 'buzz' | 'bun' | 'long' | 'mohawk' | 'bob' | 'wavy' | 'ponytail';
  outfit: string; outfit2: string; female: boolean; role: 'worker' | 'soldier' | 'scavenger' | 'scholar';
}
export const LOOKS: Record<AvatarId, Look> = {
  m1_worker: { skin: '#E0AC85', hair: '#3B2A1E', hairStyle: 'short', outfit: '#3E6A9A', outfit2: '#F2C94C', female: false, role: 'worker' },
  m2_soldier: { skin: '#8D5A3C', hair: '#1B1B1B', hairStyle: 'buzz', outfit: '#4E5D45', outfit2: '#2F3A2A', female: false, role: 'soldier' },
  m3_scavenger: { skin: '#C68B5D', hair: '#6B3F1F', hairStyle: 'mohawk', outfit: '#7A4E3A', outfit2: '#A8895A', female: false, role: 'scavenger' },
  m4_scholar: { skin: '#F1CBA7', hair: '#8F8F8F', hairStyle: 'wavy', outfit: '#5A4A8C', outfit2: '#D9CFF5', female: false, role: 'scholar' },
  f1_worker: { skin: '#D99A6E', hair: '#2E1E14', hairStyle: 'bun', outfit: '#3E6A9A', outfit2: '#F2C94C', female: true, role: 'worker' },
  f2_soldier: { skin: '#F0C9A6', hair: '#B5451B', hairStyle: 'ponytail', outfit: '#4E5D45', outfit2: '#2F3A2A', female: true, role: 'soldier' },
  f3_scavenger: { skin: '#6E4630', hair: '#141414', hairStyle: 'long', outfit: '#7A4E3A', outfit2: '#A8895A', female: true, role: 'scavenger' },
  f4_scholar: { skin: '#E8B48E', hair: '#5B3B7A', hairStyle: 'bob', outfit: '#5A4A8C', outfit2: '#D9CFF5', female: true, role: 'scholar' },
};
export const ROLE_BLURB: Record<Look['role'], string> = {
  worker: 'Steady hands. Looks at home on the factory floor.',
  soldier: 'Holds the wall. Never met a turret they did not like.',
  scavenger: 'Goes further out than is sensible, and comes back heavier.',
  scholar: 'Reads the manual. Then rewrites it.',
};

const STEEL = '#8C9BAC', STEEL_DK = '#5C6B7C', HAZ = '#F2C94C', GLOW = '#9CD64A', VIOLET = '#B48CF2', GLASS = '#6FD3E8';

const hair = (l: Look): string => {
  const c = l.hair;
  switch (l.hairStyle) {
    case 'short': return `<path d="M42 44 C42 30 78 30 78 44 L78 50 C74 42 66 40 60 40 C54 40 46 42 42 50Z" fill="${c}"/>`;
    case 'buzz': return `<path d="M43 46 C44 34 76 34 77 46 L77 48 C70 44 50 44 43 48Z" fill="${c}"/>`;
    case 'mohawk': return `<path d="M56 42 L60 20 L64 42Z" fill="${c}"/><path d="M44 46 C46 38 74 38 76 46 L76 48 C70 45 50 45 44 48Z" fill="${c}"/>`;
    case 'wavy': return `<path d="M40 48 C40 28 80 28 80 48 L80 56 C78 48 76 46 72 46 C70 50 68 52 66 48 C62 52 58 52 54 48 C52 52 48 52 46 46 C42 46 40 50 40 56Z" fill="${c}"/>`;
    case 'bun': return `<circle cx="60" cy="30" r="8" fill="${c}"/><path d="M42 46 C42 32 78 32 78 46 L78 50 C72 44 48 44 42 50Z" fill="${c}"/>`;
    case 'ponytail': return `<path d="M42 46 C42 32 78 32 78 46 L78 50 C72 44 48 44 42 50Z" fill="${c}"/><path d="M76 42 C88 46 90 66 84 80 C82 70 78 60 74 56Z" fill="${c}"/>`;
    case 'long': return `<path d="M40 48 C40 30 80 30 80 48 L82 84 L72 84 L72 60 C66 54 54 54 48 60 L48 84 L38 84Z" fill="${c}"/>`;
    case 'bob': return `<path d="M40 48 C40 30 80 30 80 48 L80 68 L72 68 L72 56 C66 52 54 52 48 56 L48 68 L40 68Z" fill="${c}"/>`;
  }
};

/** Body silhouette: head, neck, torso, arms, legs. */
const body = (l: Look): string => {
  const w = l.female ? 18 : 22; // torso half-width at shoulders
  return `
<g class="av-legs"><rect x="46" y="120" width="12" height="44" rx="4" fill="${l.skin}"/><rect x="62" y="120" width="12" height="44" rx="4" fill="${l.skin}"/></g>
<rect x="${60 - w - 6}" y="76" width="10" height="46" rx="5" fill="${l.skin}"/><rect x="${60 + w - 4}" y="76" width="10" height="46" rx="5" fill="${l.skin}"/>
<path d="M${60 - w} 74 L${60 + w} 74 L${60 + w - 4} 124 L${60 - w + 4} 124Z" fill="${l.skin}"/>
<rect x="54" y="62" width="12" height="14" fill="${l.skin}"/>
<ellipse cx="60" cy="48" rx="18" ry="20" fill="${l.skin}"/>
<g class="av-eyes"><circle cx="53" cy="50" r="2" fill="#1a1a1a"/><circle cx="67" cy="50" r="2" fill="#1a1a1a"/></g>
<path d="M56 58 Q60 61 64 58" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>`;
};

const outfit = (l: Look): string => {
  const w = l.female ? 18 : 22;
  const torso = `<path d="M${60 - w} 74 L${60 + w} 74 L${60 + w - 4} 124 L${60 - w + 4} 124Z" fill="${l.outfit}"/>`;
  const pants = `<rect x="44" y="118" width="16" height="42" rx="3" fill="${l.outfit2}"/><rect x="60" y="118" width="16" height="42" rx="3" fill="${l.outfit2}"/>`;
  const boots = `<rect x="43" y="156" width="17" height="12" rx="3" fill="#2A2A2E"/><rect x="60" y="156" width="17" height="12" rx="3" fill="#2A2A2E"/>`;
  switch (l.role) {
    case 'worker': return `${pants}${torso}<path d="M${60 - w + 4} 74 L${60 - w + 12} 74 L${60 - w + 12} 124 L${60 - w + 6} 124Z M${60 + w - 4} 74 L${60 + w - 12} 74 L${60 + w - 12} 124 L${60 + w - 6} 124Z" fill="${l.outfit2}"/><rect x="50" y="96" width="20" height="14" rx="2" fill="${l.outfit2}"/>${boots}`;
    case 'soldier': return `${pants}${torso}<rect x="${60 - w + 2}" y="82" width="${2 * w - 4}" height="6" fill="${l.outfit2}"/><rect x="${60 - w + 2}" y="104" width="${2 * w - 4}" height="6" fill="${l.outfit2}"/>${boots}`;
    case 'scavenger': return `${pants}${torso}<path d="M${60 - w - 2} 74 C56 84 64 84 ${60 + w + 2} 74 L${60 + w + 2} 82 C64 92 56 92 ${60 - w - 2} 82Z" fill="${l.outfit2}"/><rect x="${60 - w + 2}" y="108" width="${2 * w - 4}" height="8" fill="#3A2A20"/>${boots}`;
    case 'scholar': return `${pants}<path d="M${60 - w - 2} 74 L${60 + w + 2} 74 L${60 + w + 4} 140 L${60 - w - 4} 140Z" fill="${l.outfit}"/><path d="M60 74 L54 140 L66 140Z" fill="${l.outfit2}"/>${boots}`;
  }
};

/** Base headwear per role — the thing that says who they are before any gear. */
const roleProp = (l: Look): string => {
  switch (l.role) {
    case 'worker': return `<path d="M40 44 C40 30 80 30 80 44 L82 46 L38 46Z" fill="${HAZ}"/><rect x="56" y="26" width="8" height="6" rx="1" fill="${HAZ}"/><path d="M42 44 C42 33 78 33 78 44" fill="none" stroke="#C9A43B" stroke-width="2"/>`; // hard hat
    case 'soldier': return `<path d="M42 40 C44 32 76 32 78 40 L78 44 L42 44Z" fill="#2F3A2A"/><path d="M76 42 L88 40 L84 48Z" fill="#2F3A2A"/>`; // bandana with tail
    case 'scavenger': return `<rect x="44" y="34" width="32" height="6" rx="2" fill="#3A2A20"/><circle cx="52" cy="37" r="5" fill="#2A2A2E" stroke="#8C6A44" stroke-width="2"/><circle cx="68" cy="37" r="5" fill="#2A2A2E" stroke="#8C6A44" stroke-width="2"/>`; // goggles pushed up
    case 'scholar': return `<rect x="30" y="112" width="14" height="18" rx="1" fill="#7A3B3B"/><rect x="32" y="114" width="10" height="14" fill="#F1E6C8"/>`; // a book under the arm
  }
};

// ---------------------------------------------------------------- Gear pieces
const workTools = (tier: number, l: Look): string => {
  const w = l.female ? 18 : 22;
  const p: string[] = [];
  if (tier >= 1) p.push(`<rect x="${60 - w + 2}" y="112" width="${2 * w - 4}" height="7" fill="#5A3A22"/><rect x="56" y="111" width="8" height="9" fill="${HAZ}"/>`); // belt
  if (tier >= 2) p.push(`<rect x="${60 - w - 8}" y="112" width="14" height="12" rx="3" fill="#8C6A44"/><rect x="${60 + w - 6}" y="112" width="14" height="12" rx="3" fill="#8C6A44"/>`); // gloves
  if (tier >= 3) p.push(`<rect x="${60 + w + 2}" y="96" width="6" height="26" rx="1" fill="${STEEL_DK}"/><rect x="${60 + w - 1}" y="92" width="12" height="8" rx="2" fill="${STEEL}"/>`); // wrench
  if (tier >= 4) p.push(`<path d="M${60 - w - 8} 100 L${60 - w - 2} 96 L${60 - w + 2} 104 L${60 - w - 4} 108Z" fill="${STEEL}"/><rect x="${60 - w + 4}" y="90" width="10" height="4" fill="${HAZ}"/><rect x="${60 + w - 14}" y="90" width="10" height="4" fill="${HAZ}"/>`); // pauldron tool + hazard stripes
  return p.join('');
};
const fieldArmor = (tier: number, l: Look): string => {
  const w = l.female ? 18 : 22;
  const p: string[] = [];
  if (tier >= 1) p.push(`<path d="M${60 - w - 6} 74 L${60 - w + 6} 74 L${60 - w + 4} 86 L${60 - w - 6} 84Z M${60 + w + 6} 74 L${60 + w - 6} 74 L${60 + w - 4} 86 L${60 + w + 6} 84Z" fill="${STEEL}"/>`); // shoulder pads
  if (tier >= 2) p.push(`<path d="M${60 - w + 4} 78 L${60 + w - 4} 78 L${60 + w - 8} 106 L60 110 L${60 - w + 8} 106Z" fill="${STEEL_DK}"/><path d="M60 82 L60 106" stroke="${STEEL}" stroke-width="2"/>`); // chest plate
  if (tier >= 3) p.push(`<rect x="${60 - w - 6}" y="88" width="10" height="24" rx="3" fill="${STEEL_DK}"/><rect x="${60 + w - 4}" y="88" width="10" height="24" rx="3" fill="${STEEL_DK}"/><rect x="44" y="126" width="14" height="22" rx="3" fill="${STEEL_DK}"/><rect x="62" y="126" width="14" height="22" rx="3" fill="${STEEL_DK}"/>`); // arm + leg guards
  if (tier >= 4) p.push(`<path d="M40 44 C40 26 80 26 80 44 L80 52 L40 52Z" fill="${STEEL}"/><rect x="44" y="46" width="32" height="8" rx="2" fill="${GLASS}" opacity=".85"/><rect x="58" y="26" width="4" height="10" fill="${HAZ}"/>`); // helmet + visor
  return p.join('');
};
const powerCells = (tier: number, l: Look): string => {
  const w = l.female ? 18 : 22;
  const p: string[] = [];
  if (tier >= 1) p.push(`<rect x="${60 - w + 6}" y="86" width="8" height="12" rx="2" fill="#2A2A2E"/><rect x="${60 - w + 8}" y="88" width="4" height="8" fill="${GLOW}" class="anim-glow"/>`);
  if (tier >= 2) p.push(`<rect x="${60 + w - 14}" y="86" width="8" height="12" rx="2" fill="#2A2A2E"/><rect x="${60 + w - 12}" y="88" width="4" height="8" fill="${GLOW}" class="anim-glow"/>`);
  if (tier >= 3) p.push(`<path d="M${60 - w + 4} 100 L${60 + w - 4} 100" stroke="${GLOW}" stroke-width="2" opacity=".8"/><circle cx="60" cy="100" r="4" fill="${GLOW}" class="anim-glow"/>`);
  if (tier >= 4) p.push(`<circle cx="60" cy="100" r="9" fill="none" stroke="${GLOW}" stroke-width="2" class="anim-sparkle"/>`);
  return p.join('');
};
/** Backpack for tier 3+, drawn behind the body. */
const powerCellsBack = (tier: number): string =>
  tier >= 3 ? `<rect x="36" y="80" width="12" height="36" rx="4" fill="#2A2A2E"/><rect x="72" y="80" width="12" height="36" rx="4" fill="#2A2A2E"/><rect x="40" y="86" width="4" height="24" fill="${GLOW}" opacity=".7" class="anim-glow"/><rect x="76" y="86" width="4" height="24" fill="${GLOW}" opacity=".7" class="anim-glow"/>` : '';
const scholarKit = (tier: number, l: Look): string => {
  const w = l.female ? 18 : 22;
  const p: string[] = [];
  if (tier >= 1) p.push(`<circle cx="53" cy="50" r="5" fill="none" stroke="${VIOLET}" stroke-width="1.6"/><circle cx="67" cy="50" r="5" fill="none" stroke="${VIOLET}" stroke-width="1.6"/><path d="M58 50h4" stroke="${VIOLET}" stroke-width="1.6"/>`); // glasses
  if (tier >= 2) p.push(`<path d="M${60 - w - 2} 78 L${60 + w + 6} 118" stroke="#6A4A2A" stroke-width="3"/><rect x="${60 + w - 2}" y="112" width="18" height="14" rx="2" fill="#8C6A44"/>`); // satchel
  if (tier >= 3) p.push(`<rect x="${60 - w - 10}" y="100" width="12" height="16" rx="2" fill="#2A2A2E"/><rect x="${60 - w - 8}" y="102" width="8" height="12" fill="${VIOLET}" opacity=".9"/>`); // tablet
  if (tier >= 4) p.push(`<g class="anim-orbit" style="transform-origin:60px 48px"><circle cx="60" cy="18" r="3" fill="${VIOLET}"/><circle cx="86" cy="48" r="2.5" fill="${VIOLET}"/><circle cx="34" cy="48" r="2.5" fill="${VIOLET}"/></g>`); // orbiting motes
  return p.join('');
};

export function avatarSvg(id: AvatarId, gear: Record<StatId, number>, size = 160, opts: { idle?: boolean } = {}): string {
  const l = LOOKS[id];
  const scale = size / 180;
  const helmet = gear.speed >= 4;
  return `<svg class="avatar${opts.idle === false ? '' : ' av-idle'}" width="${Math.round(120 * scale)}" height="${size}" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="60" cy="170" rx="30" ry="5" fill="#000" opacity=".25"/>
<g class="av-body">
${powerCellsBack(gear.energy)}
${body(l)}
${outfit(l)}
${helmet ? '' : hair(l)}
${helmet ? '' : roleProp(l)}
${workTools(gear.strength, l)}
${powerCells(gear.energy, l)}
${fieldArmor(gear.speed, l)}
${scholarKit(gear.research, l)}
</g></svg>`;
}
