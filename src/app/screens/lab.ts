import { h } from '../dom';
import { store } from '../store';
import { act, armed, sheet, toast } from '../ui';
import { TECHS, ZONES, C, effectiveLevel, hasTech, techAvailable, type State, type TechId } from '../../engine';

type Sub = 'research' | 'zones' | 'history' | 'settings';
let sub: Sub = 'research';

export function renderLab(s: State): Node {
  const tabs: Array<[Sub, string]> = [['research', 'Research'], ['zones', 'Zones'], ['history', 'History'], ['settings', 'Settings']];
  return h('div.stack',
    h('div.seg.c4', tabs.map(([id, label]) => h(`button.btn.sm${sub === id ? '.on' : ''}`, { onclick: () => { sub = id; store.refresh(); } }, label))),
    sub === 'research' ? research(s) : sub === 'zones' ? zones(s) : sub === 'history' ? history(s) : settings(s));
}

function research(s: State): Node {
  const tiers = [1, 2, 3] as const;
  return h('div.stack',
    h('p.dim.small', 'Research comes from nutrition habits and rare finds while looting.'),
    tiers.map(t => h('div.card.stack', h('h3', `Tier ${t}`),
      (Object.values(TECHS).filter(x => x.tier === t)).map(d => techRow(s, d.id)))));
}
function techRow(s: State, id: TechId): Node {
  const d = TECHS[id];
  const done = hasTech(s, id);
  const avail = techAvailable(s, id);
  return h(`div.card.flat.row.between${done ? '' : avail ? '' : '.locked'}`,
    h('div', h('b', d.name, done && h('span.c-energy', ' ✓')), h('div.dim.small', d.effect), !done && d.requires.length > 0 && !avail && h('div.small.c-strength', `Needs ${d.requires.map(r => TECHS[r].name).join(' + ')}`)),
    !done && h('button.btn.sm', { disabled: !avail || s.research < d.cost, onclick: () => act({ type: 'research', tech: id }) }, `${d.cost} R`));
}

function zones(s: State): Node {
  const lvl = effectiveLevel(s, 'speed') - 1;
  return h('div.stack',
    h('p.dim.small', `Your speed level is ${lvl}. Deeper zones pay more but raiders follow you home: the deepest tier you have looted sets the raid strength.`),
    ZONES.map(z => {
      const open = lvl >= z.requiredSpeed;
      const reached = s.maxZoneTierReached >= z.tier;
      return h(`div.card.row.between${open ? '' : '.locked'}`,
        h('div', h('b', z.name, reached && h('span.c-gold', ' ★')), h('div.dim.small', `${z.lootMult}× loot · needs speed ${z.requiredSpeed}${z.tier >= 4 ? ' · rare gear drops' : ''}`)),
        h('span.small', { className: open ? 'c-energy' : 'c-strength' }, open ? 'Open' : `${z.requiredSpeed - lvl} short`));
    }),
    h('div.card.stack', h('h3', 'Raids'), h('p.dim.small', `The first ${C.RAID_GRACE_RUNS} successful loot runs are safe. After that each run has a ${Math.round(C.RAID_CHANCE * 100)}% chance of a raid. A raid lasts ${C.RAID_APPROACH_TICKS} ticks; every loaded turret fires once per tick until its shots for the raid are spent.`),
      h('p.dim.small', `Loot runs so far: ${s.lootRunsCompleted}. Raids: ${s.raidHistory.length}.`)));
}

function history(s: State): Node {
  if (s.sessions.length === 0) return h('div.empty', 'No sessions yet. Every real workout shows up here.');
  const groups = new Map<string, State['sessions']>();
  for (const x of s.sessions) { const k = new Date(x.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); (groups.get(k) ?? groups.set(k, []).get(k)!).push(x); }
  return h('div.stack', [...groups.entries()].slice(0, 30).map(([day, xs]) => h('div.card.stack',
    h('h3', day),
    xs.map(x => h('div.row.between.small', { style: { alignItems: 'flex-start' } },
      h('span', h('b', { className: x.kind === 'cardio' ? 'c-cardio' : x.kind === 'strength' ? 'c-strength' : 'c-energy' }, cap(x.kind)), ` ${x.minutes} min ${x.intensity}`),
      h('span.dim', { style: { textAlign: 'right', maxWidth: '60%', color: x.failed ? 'var(--danger)' : undefined } }, x.result))))),
    s.archived.sessions > 0 && h('p.dim.small', `${s.archived.sessions} older sessions are counted in your lifetime totals but no longer listed.`));
}

function settings(s: State): Node {
  return h('div.stack',
    h('div.card.stack', h('h3', 'Backup'),
      h('p.dim.small', 'Your factory lives in this browser only. Export before switching phones.'),
      h('div.seg.c2',
        h('button.btn', { onclick: async () => { try { await navigator.clipboard.writeText(store.export()); toast('Save copied to clipboard.', 'ok'); } catch { toast('Could not copy.', 'danger'); } } }, 'Copy save'),
        h('button.btn', { onclick: () => importSheet() }, 'Paste save'))),
    h('div.card.stack', h('h3', 'Danger zone'),
      h('p.dim.small', 'Wipes everything and starts over. There is no undo.'),
      armed('Reset factory', () => store.reset())),
    h('p.dim.small', { style: { textAlign: 'center' } }, `Fitness Factory 1.0 · save v${s.version}`));
}
function importSheet(): void {
  const ta = h('textarea.input', { rows: 6, placeholder: 'Paste the exported save here', style: { minHeight: '120px', padding: '10px', fontSize: '12px' } }) as HTMLTextAreaElement;
  sheet(close => h('div.stack', h('h2', 'Paste save'), ta,
    h('button.btn.primary.block', { onclick: () => { if (store.import(ta.value)) { toast('Save restored.', 'ok'); close(); } else toast('That is not a valid 1.0 save.', 'danger'); } }, 'Restore')));
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
