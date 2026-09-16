import { h, svg } from '../dom';
import { store } from '../store';
import { act, bagChips, costChips, icon, sheet, toast } from '../ui';
import { floorDefs } from '../../art/floor';
import { CELL, barricade as barricadeArt, fieldCell, gateCell, placeableMark, raiderTop, rangeMark, roadCell, turretTop, wallCell } from '../../art/defence';
import {
  BARRICADE, GATE, GRID_COLS, GRID_ROWS, RAIDERS, RALLY, RESOURCES, TURRETS, TURRET_COMBAT, WALLS, ZONES, C,
  barricadeable, cellFromIndex, cellIndex, chebyshev, pathOf, placeable, waveDef, wallDef,
  type Fight, type Raider, type RaidOutcome, type State,
} from '../../engine';
import { openTurretInfo } from './info';

type Mode = 'view' | 'place' | 'barricade';
const ui: { mode: Mode; pick: string | null; timer: number | null; speed: 1 | 2; rallyArmed: boolean; angles: Record<string, number> } =
  { mode: 'view', pick: null, timer: null, speed: 1, rallyArmed: false, angles: {} };

const PAD = 8;
const W = GRID_COLS * CELL + PAD * 2, H = GRID_ROWS * CELL + PAD * 2;
const cellXY = (i: number) => { const c = cellFromIndex(i); return { x: PAD + c.c * CELL, y: PAD + c.r * CELL }; };
const center = (i: number) => { const p = cellXY(i); return { x: p.x + CELL / 2, y: p.y + CELL / 2 }; };

export function renderDefence(s: State): Node {
  const pr = s.pendingRaid;
  const fight = pr?.fight ?? null;
  const fighting = !!fight && fight.tick > 0 && !fight.done;
  const wall = wallDef(s.wall);
  if (!fighting) stopTimer();

  return h('div.stack',
    h('div.row.between', h('div', h('h2', 'Defence'), h('p.dim.small', `${wall.name} · ${Object.keys(s.turretCells).length}/${Object.keys(s.turrets).length} turrets on the field`)),
      !pr && h('div.seg.c2', { style: { minWidth: '180px' } },
        h(`button.btn.sm${ui.mode === 'place' ? '.on' : ''}`, { onclick: () => { ui.mode = ui.mode === 'place' ? 'view' : 'place'; ui.pick = null; store.refresh(); } }, 'Place'),
        h(`button.btn.sm${ui.mode === 'barricade' ? '.on' : ''}`, { onclick: () => { ui.mode = ui.mode === 'barricade' ? 'view' : 'barricade'; ui.pick = null; store.refresh(); } }, 'Barricade'))),
    pr && !fight!.done && banner(s, fight!),
    field(s),
    fight?.done && result(s, fight.done),
    fighting && controls(s, fight!),
    !pr && hint(s),
    !pr && roster(s),
    !pr && wallCard(s),
    !pr && wavePreview(s),
  );
}

// ---------------------------------------------------------------- pieces
function banner(s: State, f: Fight): Node {
  const zone = ZONES[Math.max(0, (s.pendingRaid?.zoneTier ?? 1) - 1)]!;
  const alive = f.raiders.filter(r => r.alive && !r.breached).length;
  if (f.tick === 0) return h('div.notice.danger.stack',
    h('p', h('b', 'Raiders at the gate.'), ` They followed your tracks back from ${zone.name}: ${f.raiders.length} of them. Loot runs are blocked until this is settled.`),
    h('p.small.dim', 'Place turrets and barricades first if you need to. When you press Defend the fight runs; Rally is your one move during it.'),
    h('button.btn.primary.block', { onclick: () => startFight() }, 'Defend the factory'));
  return h('div.notice.danger.row.between', h('span', h('b', `Tick ${f.tick}`), ` · ${alive} raider${alive === 1 ? '' : 's'} on the field`), h('span.dim.small', f.wallHp > 0 ? `gate ${f.wallHp} HP` : ''));
}

function field(s: State): Node {
  const road = pathOf(s);
  const roadSet = new Set(road.map(cellIndex));
  const f = s.pendingRaid?.fight ?? null;
  const parts: string[] = [];
  const wallMax = wallDef(s.wall).hp;

  // Cells
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    const { x, y } = cellXY(i);
    const c = cellFromIndex(i);
    if (c.r === GATE.r) parts.push(i === cellIndex(GATE) ? gateCell(x, y, wallMax ? (f ? f.wallHp : wallMax) / wallMax : -1) : wallCell(x, y));
    else if (roadSet.has(i)) parts.push(roadCell(x, y));
    else parts.push(fieldCell(x, y));
  }
  // Entry arrow
  const entry = cellXY(cellIndex(road[0]!));
  parts.push(`<path d="M${entry.x + CELL / 2 - 8} ${entry.y + 6} l8 10 l8 -10" fill="none" stroke="var(--danger)" stroke-width="3"/>`);

  // Mode overlays
  if (!f && ui.mode === 'place') {
    const range = ui.pick ? TURRET_COMBAT[s.turrets[ui.pick]?.def ?? 'scrap_launcher'].range : 0;
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) if (placeable(s, i)) { const { x, y } = cellXY(i); parts.push(placeableMark(x, y, !!ui.pick)); }
    void range;
  }
  if (!f && ui.mode === 'barricade') for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) if (barricadeable(s, i)) { const { x, y } = cellXY(i); parts.push(placeableMark(x, y, true)); }
  // Range of the picked / tapped turret
  const showRangeFor = ui.pick && s.turretCells[ui.pick] !== undefined ? ui.pick : null;
  if (showRangeFor) {
    const at = cellFromIndex(s.turretCells[showRangeFor]!);
    const r = TURRET_COMBAT[s.turrets[showRangeFor]!.def].range;
    for (const rc of road) if (chebyshev(at, rc) <= r) { const { x, y } = cellXY(cellIndex(rc)); parts.push(rangeMark(x, y)); }
  }

  // Barricades
  for (const b of s.barricades) { const { x, y } = cellXY(b.cell); parts.push(barricadeArt(x, y, b.hp / BARRICADE.hp)); }

  // Turrets (rotate toward last target)
  const lastShots = f?.last.shots ?? [];
  for (const [iid, cell] of Object.entries(s.turretCells)) {
    const t = s.turrets[iid]; if (!t) continue;
    const { x, y } = cellXY(cell);
    const shot = lastShots.find(sh => sh.turretIid === iid);
    if (shot && f) {
      const target = f.raiders.find(r => r.id === shot.targetId);
      if (target) { const tp = raiderXY(road, target); const cc = center(cell); ui.angles[iid] = Math.atan2(tp.y - cc.y, tp.x - cc.x) * 180 / Math.PI; }
    } else if (ui.angles[iid] === undefined) ui.angles[iid] = -90;
    parts.push(`<g data-turret="${iid}" class="${shot ? 'firing' : ''}">${turretTop(t.def, x, y, ui.angles[iid]!, !!shot && (t.def === 'minigun' || t.def === 'double_minigun'))}` +
      `<text x="${x + CELL / 2}" y="${y + CELL - 2}" text-anchor="middle" class="node-sub" style="font-size:9px">${t.ammo}</text></g>`);
  }

  // Tracers for last tick
  if (f) for (const sh of lastShots) {
    const cell = s.turretCells[sh.turretIid]; const target = f.raiders.find(r => r.id === sh.targetId);
    if (cell === undefined || !target) continue;
    const a = center(cell), b = raiderXY(road, target);
    parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="var(--flame)" stroke-width="2" class="tracer"/>`);
  }
  // Rally flash
  if (f && f.last.rally > 0) { const g = center(cellIndex(GATE)); parts.push(`<circle cx="${g.x}" cy="${g.y - CELL}" r="${CELL * 0.9}" fill="var(--hazard)" class="tracer" opacity=".35"/>`); }

  // Raiders
  if (f) for (const r of f.raiders) {
    if (!r.alive || r.pos < 0) continue;
    const p = raiderXY(road, r);
    parts.push(`<g class="raider-g${r.breached ? ' breached' : ''}" style="transform:translate(${p.x}px,${p.y}px)">${raiderTop(r.type, 0, 0, r.hp / r.maxHp)}</g>`);
  }
  // Kills this tick: a puff where they fell
  if (f) for (const id of f.last.kills) {
    const r = f.raiders.find(x => x.id === id); if (!r) continue;
    const p = raiderXY(road, r);
    parts.push(`<g class="anim-smoke" style="transform-origin:${p.x}px ${p.y}px"><circle cx="${p.x}" cy="${p.y}" r="9" fill="var(--smoke)"/></g>`);
  }

  const el = svg(`<svg class="field" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${floorDefs()}${parts.join('')}</svg>`) as SVGSVGElement;
  el.addEventListener('click', e => onFieldTap(e, s));
  return el;
}
/** Raider world position: interpolated along the road; breachers sit inside the gate. */
function raiderXY(road: ReturnType<typeof pathOf>, r: Raider): { x: number; y: number } {
  if (r.breached) { const g = center(cellIndex(GATE)); return { x: g.x, y: g.y + 4 }; }
  const i = Math.min(road.length - 1, Math.floor(r.pos)), frac = r.pos - Math.floor(r.pos);
  const a = center(cellIndex(road[i]!)), b = center(cellIndex(road[Math.min(road.length - 1, i + 1)]!));
  // spread by id so they don't stack
  const jitter = ((r.id * 7) % 5 - 2) * 4;
  return { x: a.x + (b.x - a.x) * frac + jitter, y: a.y + (b.y - a.y) * frac + ((r.id * 3) % 3 - 1) * 4 };
}

function onFieldTap(e: Event, s: State): void {
  if (s.pendingRaid && s.pendingRaid.fight.tick > 0) return;
  const svgEl = e.currentTarget as SVGSVGElement;
  const pt = svgEl.createSVGPoint(); pt.x = (e as MouseEvent).clientX; pt.y = (e as MouseEvent).clientY;
  const p = pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
  const c = Math.floor((p.x - PAD) / CELL), r = Math.floor((p.y - PAD) / CELL);
  if (c < 0 || r < 0 || c >= GRID_COLS || r >= GRID_ROWS) return;
  const i = cellIndex({ c, r });
  const turretHere = Object.entries(s.turretCells).find(([, cell]) => cell === i)?.[0] ?? null;

  if (ui.mode === 'barricade') {
    const existing = s.barricades.find(b => b.cell === i);
    if (existing) { act({ type: 'remove_barricade', cell: i }); return; }
    act({ type: 'build_barricade', cell: i });
    return;
  }
  if (ui.mode === 'place') {
    if (ui.pick) { if (act({ type: 'place_turret', iid: ui.pick, cell: i })) { ui.pick = null; } return; }
    if (turretHere) { ui.pick = turretHere; store.refresh(); return; }
    toast('Pick a turret from the roster first, then tap where it goes.');
    return;
  }
  // view: tap a turret → show its range; tap again → sheet
  if (turretHere) { if (ui.pick === turretHere) openTurretInfo(s.turrets[turretHere]!.def); else { ui.pick = turretHere; store.refresh(); } return; }
  ui.pick = null; store.refresh();
}

function roster(s: State): Node {
  const ts = Object.values(s.turrets);
  return h('div.card.stack',
    h('div.row.between', h('h3', 'Turrets'), h('span.dim.small', 'Buy turrets on the Factory wall')),
    ts.length === 0 ? h('div.empty', 'No turrets yet.') :
      ts.map(t => {
        const placed = s.turretCells[t.iid] !== undefined;
        const cs = TURRET_COMBAT[t.def];
        return h(`div.row.between.small${ui.pick === t.iid ? '.picked' : ''}`,
          h('span', h('b', TURRETS[t.def].name), h('span.dim', ` · range ${cs.range} · ${cs.damage}×${cs.rate}/tick · `), icon(TURRETS[t.def].ammo, 12), h('span.dim', ` ${t.ammo}`)),
          h('div.row',
            t.ammo < C.AMMO_CAP && s.res[TURRETS[t.def].ammo] > 0 && h('button.btn.sm', { onclick: () => act({ type: 'load_ammo', iid: t.iid, fill: true }) }, 'Fill'),
            placed && h('button.btn.sm', { onclick: () => act({ type: 'unplace_turret', iid: t.iid }) }, 'Pick up'),
            h('button.btn.sm', { onclick: () => { ui.mode = 'place'; ui.pick = t.iid; store.refresh(); toast(`Tap a field cell for the ${TURRETS[t.def].name}.`); } }, placed ? 'Move' : 'Place')));
      }));
}

function wallCard(s: State): Node {
  const wall = wallDef(s.wall);
  const next = s.wall < 3 ? WALLS[s.wall]! : null;
  return h('div.card.stack',
    h('div.row.between', h('div', h('h3', wall.name), h('div.dim.small', `${wall.blurb} ${wall.hp ? `Gate ${wall.hp} HP.` : ''} Barricades: ${s.barricades.length}/${wall.barricades}.`)),
      next && h('button.btn.sm', { onclick: () => act({ type: 'upgrade_wall' }) }, `→ ${next.name}`)),
    next && costChips(s, { res: next.cost, gold: next.gold }),
    h('p.dim.small', `A barricade costs ${BARRICADE.labor} Labor + 4 Stone, has ${BARRICADE.hp} HP, and stands until raiders break it. Rally costs ${RALLY.labor} Labor per use, hits for ${RALLY.damage} at the gate, and needs ${RALLY.cooldown} ticks to recover.`));
}

function wavePreview(s: State): Node {
  const tier = Math.max(1, s.maxZoneTierReached);
  const w = waveDef(tier);
  return h('div.card.stack', h('h3', `Next raid: ${ZONES[tier - 1]!.name} crew`),
    h('div.row.wrap', w.groups.map(g => h('span.chip', svg(`<svg width="18" height="18" viewBox="-14 -14 28 28">${raiderTop(g.type, 0, 0, 1)}</svg>`), `${g.count} ${RAIDERS[g.type].name}${g.count > 1 ? 's' : ''} · ${g.hp} HP`))),
    h('p.dim.small', 'Raiders enter two per tick at the arrow and walk the road. Turrets shoot whoever is furthest along inside their range; every shot costs ammo.'));
}

function hint(s: State): Node | null {
  if (ui.mode === 'place') return h('div.notice', ui.pick ? `Tap a field cell to put the ${TURRETS[s.turrets[ui.pick]?.def ?? 'scrap_launcher'].name} there.` : 'Tap a turret in the roster, or one on the field to move it.');
  if (ui.mode === 'barricade') return h('div.notice', 'Tap a road cell to build a barricade. Tap a barricade to remove it.');
  return null;
}

// ---------------------------------------------------------------- fight
function startFight(): void {
  ui.mode = 'view'; ui.pick = null; ui.rallyArmed = false;
  stopTimer();
  step();
  ui.timer = window.setInterval(step, ui.speed === 2 ? 380 : 700);
}
function step(): void {
  const rally = ui.rallyArmed; ui.rallyArmed = false;
  const err = store.dispatch({ type: 'raid_tick', rally });
  if (err) { stopTimer(); return; }
  if (store.state.pendingRaid?.fight.done) stopTimer();
}
function stopTimer(): void { if (ui.timer !== null) { clearInterval(ui.timer); ui.timer = null; } }

function controls(s: State, f: Fight): Node {
  const canRally = f.rallyCooldown === 0 && s.labor >= RALLY.labor;
  return h('div.card.stack',
    h('div.seg.c2',
      h(`button.btn.primary${ui.rallyArmed ? '.on' : ''}`, { disabled: !canRally, onclick: () => { ui.rallyArmed = true; navigator.vibrate?.(20); store.refresh(); } },
        ui.rallyArmed ? 'Rally set!' : f.rallyCooldown > 0 ? `Rally (${f.rallyCooldown})` : `Rally · ${RALLY.labor} Labor`),
      h('button.btn', { onclick: () => { ui.speed = ui.speed === 1 ? 2 : 1; stopTimer(); ui.timer = window.setInterval(step, ui.speed === 2 ? 380 : 700); store.refresh(); } }, ui.speed === 1 ? 'Speed 1×' : 'Speed 2×')),
    h('p.dim.small', `Rally sends your workers to the gate for one tick: ${RALLY.damage} damage to raiders within ${RALLY.reach} cell of it. Labor now: ${s.labor}.`));
}

function result(s: State, o: RaidOutcome): Node {
  const loss = o.loss?.kind === 'steal' ? `They carried off ${o.loss.amount} ${RESOURCES[o.loss.resource].name}.`
    : o.loss?.kind === 'turret' ? `They wrecked a ${TURRETS[o.loss.def].name}.`
    : o.loss?.kind === 'building' ? `They wrecked your ${o.loss.def.replace(/_/g, ' ')}.` : '';
  return h(`div.card.stack`, { style: { borderLeft: `3px solid ${o.repelled ? 'var(--ok)' : 'var(--danger)'}` } },
    h('h2', o.repelled ? 'Repelled' : 'Breached'),
    h('p', o.repelled ? `All ${o.killed} down in ${o.ticks} ticks.` : `${o.breached} got through in ${o.ticks} ticks; ${o.killed} didn't. ${loss}`),
    o.repelled && Object.keys(o.drops).length > 0 && h('div', h('div.dim.small', 'They were carrying:'), bagChips(o.drops)),
    o.gearDrop && h('p.c-gold', `And a piece of gear: ${o.gearDrop} tier ${s.avatar.gear[o.gearDrop]}.`),
    h('button.btn.primary.block', { onclick: () => { act({ type: 'raid_tick', rally: false }); } }, 'Back to work'));
}

export function raidPendingSheet(): void {
  sheet(close => h('div.stack', h('h2', 'Raiders at the gate'), h('p', 'Loot runs are blocked until you defend the factory.'),
    h('button.btn.primary.block', { onclick: () => { close(); location.hash = '#defence'; } }, 'Go to Defence')));
}
