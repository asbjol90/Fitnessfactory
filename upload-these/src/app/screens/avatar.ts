import { h, svg } from '../dom';
import { store } from '../store';
import { act, costChips, sheet } from '../ui';
import { avatarSvg, LOOKS, ROLE_BLURB } from '../../art/avatar';
import { AVATAR_IDS, GEAR, STAT_IDS, STAT_THRESHOLDS, C, effectiveLevel, gearUpgradeCost, levelProgress, statMult, type AvatarId, type State, type StatId } from '../../engine';

const STAT_LABEL: Record<StatId, { name: string; drives: string; from: string; cls: string }> = {
  speed: { name: 'Speed', drives: 'loot yield and zone access', from: 'cardio minutes', cls: 'c-cardio' },
  strength: { name: 'Strength', drives: 'Labor per session', from: 'Labor spent', cls: 'c-strength' },
  energy: { name: 'Energy', drives: 'Energy per session', from: 'flexibility minutes', cls: 'c-energy' },
  research: { name: 'Research', drives: 'Research gained', from: 'Research earned', cls: 'c-research' },
};

let pick: AvatarId = 'm3_scavenger';
let name = '';

export function renderAvatar(s: State): Node {
  if (!s.avatar.id) return picker(s);
  const id = s.avatar.id;
  return h('div.stack',
    h('div.card.stack',
      h('div.avatar-hero', svg(avatarSvg(id, s.avatar.gear, 220))),
      h('div', { style: { textAlign: 'center' } }, h('h1', s.avatar.name || LOOKS[id].role), h('p.dim.small', ROLE_BLURB[LOOKS[id].role]))),
    h('div.card.stack',
      h('h2', 'Stats'),
      STAT_IDS.map(st => statRow(s, st))),
    h('div.card.stack',
      h('h2', 'Gear'),
      h('p.dim.small', 'Each tier adds one level on top of your natural level, up to 5. Crafted from workshop goods, or found — very rarely — in the deepest zones.'),
      STAT_IDS.map(st => gearRow(s, st))),
    h('div.card.stack',
      h('h3', 'Lifetime'),
      h('div.grid2',
        stat('Sessions', s.sessions.length + s.archived.sessions),
        stat('Minutes', s.sessions.reduce((a, x) => a + x.minutes, 0) + s.archived.minutes),
        stat('Loot runs', s.lootRunsCompleted),
        stat('Contracts', s.contracts.completedTotal))),
    h('button.btn.block', { onclick: () => switchSheet(s) }, 'Change character'),
  );
}

function statRow(s: State, st: StatId): Node {
  const l = STAT_LABEL[st];
  const p = levelProgress(st, s.avatar.volume[st]);
  const eff = effectiveLevel(s, st);
  const pips = Array.from({ length: C.MAX_STAT_LEVEL }, (_, i) => h(`i${i < p.level ? '.nat' : i < eff ? '.gear' : ''}`));
  return h('div.stack', { style: { gap: '4px' } },
    h('div.stat-row', h('b', { className: l.cls }, l.name), h('div.lvl-pips', pips), h('span.small', `×${statMult(s, st).toFixed(1)}`)),
    h('div.bar', h('i', { style: { width: `${p.frac * 100}%` } })),
    h('div.dim.small', p.next === null ? `Maxed · drives ${l.drives}` : `${Math.round(s.avatar.volume[st])} / ${p.next} ${l.from} to level ${p.level + 1} · drives ${l.drives}`));
}

function gearRow(s: State, st: StatId): Node {
  const g = GEAR[st];
  const tier = s.avatar.gear[st];
  const cost = gearUpgradeCost(s, st);
  return h('div.row.between',
    h('div', h('b', g.name), h('div.dim.small', `Tier ${tier} / ${C.MAX_GEAR_TIER}`), cost && costChips(s, { res: { [cost.material]: cost.amount } })),
    cost ? h('button.btn.sm', { onclick: () => act({ type: 'craft_gear', stat: st }) }, 'Craft') : h('span.c-gold', 'Max'));
}
const stat = (label: string, v: number) => h('div', h('div.dim.small', label), h('div', { style: { fontFamily: 'var(--font-display)', fontSize: '20px' } }, String(v)));

function picker(s: State): Node {
  return h('div.stack',
    h('div.card.stack',
      h('h1', 'Who runs this factory?'),
      h('p.dim', 'Pick a character. Their look changes with the gear you craft; the numbers are the same for everyone.'),
      h('div.avatar-hero', svg(avatarSvg(pick, s.avatar.gear, 200))),
      h('p.dim.small', { style: { textAlign: 'center' } }, ROLE_BLURB[LOOKS[pick].role]),
      h('div.avatar-grid', AVATAR_IDS.map(id => h(`button.avatar-pick${pick === id ? '.on' : ''}`, { onclick: () => { pick = id; store.refresh(); } },
        svg(avatarSvg(id, { speed: 0, strength: 0, energy: 0, research: 0 }, 72, { idle: false })), h('span', cap(LOOKS[id].role))))),
      h('div.field', h('label', 'Name (optional)'), h('input.input', { value: name, placeholder: 'Your name', maxlength: 24, oninput: (e: Event) => { name = (e.target as HTMLInputElement).value; } })),
      h('button.btn.primary.block', { onclick: () => act({ type: 'pick_avatar', id: pick, name }) }, 'Start')));
}

function switchSheet(s: State): void {
  pick = s.avatar.id!; name = s.avatar.name;
  sheet(close => h('div.stack', h('h2', 'Change character'), h('p.dim.small', 'Stats and gear stay. Only the look changes.'),
    h('div.avatar-grid', AVATAR_IDS.map(id => h(`button.avatar-pick${pick === id ? '.on' : ''}`, { onclick: (e: Event) => { pick = id; (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('.avatar-pick').forEach(b => b.classList.remove('on')); (e.currentTarget as HTMLElement).classList.add('on'); } },
      svg(avatarSvg(id, s.avatar.gear, 72, { idle: false })), h('span', cap(LOOKS[id].role))))),
    h('button.btn.primary.block', { onclick: () => { if (act({ type: 'pick_avatar', id: pick, name })) close(); } }, 'Save')));
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
void STAT_THRESHOLDS;
