import { h } from '../dom';
import { store } from '../store';
import { act, bagChips, icon, stepper } from '../ui';
import { C, HABITS, HABIT_IDS, ZONES, effectiveLevel, previewSession, type Intensity, type SessionKind, type State, type GameEvent } from '../../engine';

// Form state survives re-renders.
const form = { kind: 'cardio' as SessionKind, minutes: 30, intensity: 'medium' as Intensity, zone: 'outskirts' };
let lastResult: { text: string; events: GameEvent[] } | null = null;

const KINDS: Array<{ id: SessionKind; label: string; gives: string }> = [
  { id: 'cardio', label: 'Cardio', gives: 'Loot' },
  { id: 'strength', label: 'Strength', gives: 'Labor' },
  { id: 'flexibility', label: 'Flexibility', gives: 'Energy' },
];

export function renderTrain(s: State): Node {
  const pv = previewSession(s, form.kind, form.minutes, form.intensity, form.zone);
  const speedLvl = effectiveLevel(s, 'speed') - 1;

  const preview = (() => {
    if (form.kind === 'strength') return h('p', 'Worth about ', h('b.c-strength', `+${pv.labor} Labor`));
    if (form.kind === 'flexibility') return h('p', 'Worth about ', h('b.c-energy', `+${pv.energy} Energy`));
    if (pv.short) return h('p.c-strength', `${pv.short} speed level${pv.short > 1 ? 's' : ''} short — ${Math.round((pv.salvageChance ?? 0) * 100)}% chance to salvage ~${pv.lootUnits} items, otherwise nothing. Speed minutes still count.`);
    return h('p', 'About ', h('b.c-cardio', `${pv.lootUnits} items`), `, ${Math.round((pv.premiumChance ?? 0) * 100)}% premium find, ${Math.round((pv.steelChance ?? 0) * 100)}% Hardened Steel`);
  })();

  const logBtn = h('button.btn.primary.block', `Log ${form.minutes} min ${form.kind}`, {
    onclick: () => {
      let captured: GameEvent[] = [];
      const off = store.subscribe((_, ev) => { captured = ev; });
      const ok = act({ type: 'log_session', kind: form.kind, minutes: form.minutes, intensity: form.intensity, zone: form.kind === 'cardio' ? form.zone : undefined });
      off();
      if (ok) lastResult = { text: store.state.sessions[0]?.result ?? '', events: captured };
    },
  });

  return h('div.stack',
    lastResult && resultCard(lastResult),
    h('div.card.stack',
      h('h2', 'Log a session'),
      h('div.seg.c3', KINDS.map(k => h(`button.btn${form.kind === k.id ? '.on.' + k.id : ''}`, { onclick: () => { form.kind = k.id; rerender(); } }, k.label))),
      h('p.dim.small', `${KINDS.find(k => k.id === form.kind)!.label} → ${KINDS.find(k => k.id === form.kind)!.gives}`),
      h('div.field', h('label', 'Minutes'), stepper(form.minutes, C.MINUTE_MIN, 600, v => { form.minutes = v; rerender(); }, 5)),
      h('div.field', h('label', 'Intensity'),
        h('div.seg.c3', (['light', 'medium', 'hard'] as Intensity[]).map(i =>
          h(`button.btn${form.intensity === i ? '.on' : ''}`, { onclick: () => { form.intensity = i; rerender(); } }, cap(i), h('span.sub', `≤${C.MINUTE_CAP[i]}`))))),
      pv.capped && h('div.notice', `${cap(form.intensity)} sessions count up to ${C.MINUTE_CAP[form.intensity]} minutes. All ${form.minutes} are logged, ${pv.counted} are rewarded.`),
      form.kind === 'cardio' && h('div.field', h('label', 'Zone'),
        h('div.stack', { style: { gap: '6px' } }, ZONES.map(z => {
          const short = z.requiredSpeed - speedLvl;
          return h(`button.btn.block${form.zone === z.id ? '.on' : ''}`, { style: { justifyContent: 'space-between' }, onclick: () => { form.zone = z.id; rerender(); } },
            h('span', z.name), h('span.small', { style: { color: short > 0 ? 'var(--danger)' : 'var(--ink-dim)' } }, short > 0 ? `speed ${z.requiredSpeed} needed` : `×${z.lootMult}`));
        }))),
      preview,
      logBtn),
    h('div.card.stack',
      h('h2', 'Nutrition'),
      h('p.dim.small', 'Habits earn Research. Counters reset each day.'),
      HABIT_IDS.map(id => {
        const d = HABITS[id];
        const n = s.nutrition.dayKey === todayKey() ? s.nutrition.counts[id] : 0;
        const full = n >= d.dailyCap;
        return h('div.row.between',
          h('div', h('div', d.label), h('div.dim.small', `${n} / ${d.dailyCap} today · +${d.research} Research`)),
          h('button.btn.sm', { disabled: full, onclick: () => act({ type: 'log_habit', habit: id }) }, full ? 'Done' : '+'));
      })),
    s.sessions.length > 0 && h('div.card.stack',
      h('h3', 'Recent'),
      s.sessions.slice(0, 4).map(x => h('div.row.between.small',
        h('span', h('b', { className: `c-${x.kind === 'cardio' ? 'cardio' : x.kind === 'strength' ? 'strength' : 'energy'}` }, cap(x.kind)), ` ${x.minutes} min`),
        h('span.dim', { style: { textAlign: 'right' } }, x.result)))),
  );
}

function resultCard(r: { text: string; events: GameEvent[] }): Node {
  const loot = r.events.find(e => e.type === 'loot');
  const raid = r.events.some(e => e.type === 'raid_teaser');
  const failed = loot && loot.type === 'loot' && loot.outcome !== 'success';
  return h(`div.card.stack${raid ? '.anim-shake' : ''}`, { style: { borderLeft: `3px solid ${failed ? 'var(--danger)' : raid ? 'var(--hazard)' : 'var(--ok)'}` } },
    h('div.row.between', h('h3', failed ? 'Came up short' : 'Logged'), h('button.btn.sm', { onclick: () => { lastResult = null; rerender(); } }, '×')),
    h('p', r.text),
    loot && loot.type === 'loot' && Object.keys(loot.yield).length > 0 && bagChips(loot.yield),
    raid && h('div.notice.danger', icon('coal', 14), ' Raiders came while you were out. The Factory tab has the report.'));
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function rerender() { store.refresh(); }
