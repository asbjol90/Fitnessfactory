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
    wallCard(s, !!pr),
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

const live: { svg: SVGSVGElement | null; key: string } = { svg: null, key: '' };

function field(s: State): Node {
  const f = s.pendingRaid?.fight ?? null;
  const fighting = !!f && f.tick > 0 && !f.done;
  const key = `${s.wall}|${JSON.stringify(s.turretCells)}|${s.pendingRaid?.seed ?? 0}`;
  if (fighting && live.svg && live.key === key) {
    // Same field, new tick: move things instead of rebuilding, so CSS transitions carry the motion.
    const el = live.svg;
    requestAnimationFrame(() => patchField(el, s));
    return el;
  }
  const el = buildField(s);
  live.svg = el; live.key = key;
  return el;
}

function buildField(s: State): SVGSVGElement {
  const road = pathOf(s);
  const roadSet = new Set(road.map(cellIndex));
  const f = s.pendingRaid?.fight ?? null;
  const parts: string[] = [];
  const wallMax = wallDef(s.wall).hp;

  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    const { x, y } = cellXY(i);
    const c = cellFromIndex(i);
    if (c.r === GATE.r) parts.push(i === cellIndex(GATE) ? gateCell(x, y, wallMax ? (f ? f.wallHp : wallMax) / wallMax : -1).replace('fill="var(--ok)"', 'fill="var(--ok)" id="gate-hp"') : wallCell(x, y));
    else if (roadSet.has(i)) parts.push(roadCell(x, y));
    else parts.push(fieldCell(x, y));
  }
  const entry = cellXY(cellIndex(road[0]!));
  parts.push(`<path d="M${entry.x + CELL / 2 - 8} ${entry.y + 6} l8 10 l8 -10" fill="none" stroke="var(--danger)" stroke-width="3"/>`);

  if (!f && ui.mode === 'place') for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) if (placeable(s, i)) { const { x, y } = cellXY(i); parts.push(placeableMark(x, y, !!ui.pick)); }
  if (!f && ui.mode === 'barricade') for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) if (barricadeable(s, i)) { const { x, y } = cellXY(i); parts.push(placeableMark(x, y, true)); }
  const showRangeFor = ui.pick && s.turretCells[ui.pick] !== undefined ? ui.pick : null;
  if (showRangeFor) {
    const at = cellFromIndex(s.turretCells[showRangeFor]!);
    const r = TURRET_COMBAT[s.turrets[showRangeFor]!.def].range;
    for (const rc of road) if (chebyshev(at, rc) <= r) { const { x, y } = cellXY(cellIndex(rc)); parts.push(rangeMark(x, y)); }
  }

  parts.push('<g id="barricades">');
  for (const b of s.barricades) { const { x, y } = cellXY(b.cell); parts.push(`<g data-barricade="${b.cell}">${barricadeArt(x, y, b.hp / BARRICADE.hp)}</g>`); }
  parts.push('</g><g id="turrets">');
  for (const [iid, cell] of Object.entries(s.turretCells)) {
    const t = s.turrets[iid]; if (!t) continue;
    const { x, y } = cellXY(cell);
    if (ui.angles[iid] === undefined) ui.angles[iid] = -90;
    parts.push(`<g data-turret="${iid}">${turretTop(t.def, x, y, ui.angles[iid]!, false)}` +
      `<text data-ammo="${iid}" x="${x + CELL / 2}" y="${y + CELL - 2}" text-anchor="middle" class="node-sub" style="font-size:9px">${t.ammo}</text></g>`);
  }
  parts.push('</g><g id="fx"></g><g id="raiders">');
  if (f) for (const r of f.raiders) {
    if (!r.alive || r.pos < 0) continue;
    const p = raiderXY(road, r);
    parts.push(`<g data-raider="${r.id}" class="raider-g${r.breached ? ' breached' : ''}" style="transform:translate(${p.x}px,${p.y}px)">${raiderTop(r.type, 0, 0, r.hp / r.maxHp)}</g>`);
  }
  parts.push('</g>');

  const el = svg(`<svg class="field" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${floorDefs()}${parts.join('')}</svg>`) as SVGSVGElement;
  el.addEventListener('click', e => onFieldTap(e, s));
  if (f && f.tick > 0) requestAnimationFrame(() => patchField(el, s));
  return el;
}

/** Apply one tick's changes to a live field: positions, HP, barrels, tracers, puffs. */
function patchField(el: SVGSVGElement, s: State): void {
  const f = s.pendingRaid?.fight; if (!f) return;
  const road = pathOf(s);
  const NS = 'http://www.w3.org/2000/svg';
  const fx = el.querySelector('#fx')!, raidersLayer = el.querySelector('#raiders')!;

  // Raiders: create newcomers, move the rest, fade the dead.
  for (const r of f.raiders) {
    let g = el.querySelector(`[data-raider="${r.id}"]`) as SVGGElement | null;
    if (r.pos < 0) continue;
    const p = raiderXY(road, r);
    if (!g && r.alive) {
      g = document.createElementNS(NS, 'g') as SVGGElement;
      g.setAttribute('data-raider', String(r.id)); g.setAttribute('class', 'raider-g');
      g.innerHTML = raiderTop(r.type, 0, 0, r.hp / r.maxHp);
      g.style.transform = `translate(${p.x}px,${p.y}px)`;
      g.style.opacity = '0';
      raidersLayer.append(g);
      requestAnimationFrame(() => { g!.style.opacity = '1'; });
      continue;
    }
    if (!g) continue;
    if (!r.alive) {
      if (!g.classList.contains('dying')) {
        g.classList.add('dying');
        const puff = document.createElementNS(NS, 'g'); puff.setAttribute('class', 'anim-smoke'); puff.style.transformOrigin = `${p.x}px ${p.y}px`;
        puff.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="9" fill="var(--smoke)"/>`; fx.append(puff);
        setTimeout(() => { g?.remove(); puff.remove(); }, 700);
      }
      continue;
    }
    g.style.transform = `translate(${p.x}px,${p.y}px)`;
    g.classList.toggle('breached', r.breached);
    const bars = g.querySelectorAll('rect');
    const hpBar = bars[bars.length - 1]; if (hpBar) hpBar.setAttribute('width', String(parseFloat(bars[bars.length - 2]!.getAttribute('width')!) * Math.max(0, r.hp / r.maxHp)));
  }

  // Turrets: rotate toward target, flash, ammo count.
  for (const [iid, cell] of Object.entries(s.turretCells)) {
    const g = el.querySelector(`[data-turret="${iid}"]`) as SVGGElement | null; if (!g) continue;
    const shot = f.last.shots.find(sh => sh.turretIid === iid);
    if (shot) {
      const target = f.raiders.find(r => r.id === shot.targetId);
      if (target) { const tp = raiderXY(road, target); const cc = center(cell); ui.angles[iid] = Math.atan2(tp.y - cc.y, tp.x - cc.x) * 180 / Math.PI; }
      g.classList.remove('firing'); void (g as unknown as HTMLElement).offsetWidth; g.classList.add('firing');
      const def = s.turrets[iid]?.def;
      if (def === 'minigun' || def === 'double_minigun') g.querySelectorAll('.barrel g').forEach(b => b.classList.add('anim-spin'));
    } else {
      g.classList.remove('firing');
      g.querySelectorAll('.barrel g').forEach(b => b.classList.remove('anim-spin'));
    }
    const barrel = g.querySelector('.barrel') as SVGGElement | null;
    if (barrel) barrel.style.transform = `rotate(${ui.angles[iid] ?? -90}deg)`;
    const ammo = el.querySelector(`[data-ammo="${iid}"]`); if (ammo) ammo.textContent = String(s.turrets[iid]?.ammo ?? 0);
  }

  // Tracers and rally flash (short-lived).
  for (const sh of f.last.shots) {
    const cell = s.turretCells[sh.turretIid]; const target = f.raiders.find(r => r.id === sh.targetId);
    if (cell === undefined || !target) continue;
    const a = center(cell), b = raiderXY(road, target);
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', String(a.x)); line.setAttribute('y1', String(a.y)); line.setAttribute('x2', String(b.x)); line.setAttribute('y2', String(b.y));
    line.setAttribute('stroke', 'var(--flame)'); line.setAttribute('stroke-width', '2'); line.setAttribute('class', 'tracer');
    fx.append(line); setTimeout(() => line.remove(), 450);
  }
  if (f.last.rally > 0) {
    const gp = center(cellIndex(GATE));
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', String(gp.x)); c.setAttribute('cy', String(gp.y - CELL)); c.setAttribute('r', String(CELL * 0.9)); c.setAttribute('fill', 'var(--hazard)'); c.setAttribute('opacity', '.35'); c.setAttribute('class', 'tracer');
    fx.append(c); setTimeout(() => c.remove(), 450);
  }

  // Gate + barricades.
  const gate = el.querySelector('#gate-hp'); const wallMax = wallDef(s.wall).hp;
  if (gate && wallMax) gate.setAttribute('width', String((CELL - 20) * Math.max(0, f.wallHp / wallMax)));
  for (const b of Array.from(el.querySelectorAll('[data-barricade]'))) {
    const cell = Number((b as HTMLElement).dataset.barricade); const live = s.barricades.find(x => x.cell === cell);
    if (!live) { b.remove(); continue; }
    const bars = b.querySelectorAll('rect'); const bar = bars[bars.length - 1]; if (bar) bar.setAttribute('width', String(32 * Math.max(0, live.hp / BARRICADE.hp)));
  }
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

export function wallCard(s: State, locked = false): Node {
  const wall = wallDef(s.wall);
  const next = s.wall < 3 ? WALLS[s.wall]! : null;
  return h('div.card.stack',
    h('div.row.between', h('div', h('h3', wall.name), h('div.dim.small', `${wall.blurb} ${wall.hp ? `Gate ${wall.hp} HP.` : ''} Barricades: ${s.barricades.length}/${wall.barricades}.`)),
      next && h('button.btn.sm', { disabled: locked, onclick: () => act({ type: 'upgrade_wall' }) }, `→ ${next.name}`)),
    next && costChips(s, { res: next.cost, gold: next.gold }),
    locked && h('p.small.c-strength', 'Not with raiders at the gate.'),
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
  const loss = lossText(o);
  return h(`div.card.stack`, { style: { borderLeft: `3px solid ${o.repelled ? 'var(--ok)' : 'var(--danger)'}` } },
    h('h2', o.repelled ? 'Repelled' : 'Breached'),
    h('p', o.repelled ? `All ${o.killed} down in ${o.ticks} ticks.` : `${o.breached} got through in ${o.ticks} ticks; ${o.killed} didn't. ${loss}`),
    o.repelled && Object.keys(o.drops).length > 0 && h('div', h('div.dim.small', 'They were carrying:'), bagChips(o.drops)),
    o.gearDrop && h('p.c-gold', `And a piece of gear: ${o.gearDrop} tier ${s.avatar.gear[o.gearDrop]}.`),
    h('button.btn.primary.block', { onclick: () => { act({ type: 'raid_tick', rally: false }); } }, 'Back to work'));
}

export function lossText(o: RaidOutcome): string {
  if (!o.losses.length) return 'They found nothing worth taking.';
  return o.losses.map(l => l.kind === 'steal' ? `carried off ${l.amount} ${RESOURCES[l.resource].name}`
    : l.kind === 'turret' ? `wrecked a ${TURRETS[l.def].name}`
    : l.kind === 'building' ? `wrecked your ${l.def.replace(/_/g, ' ')}`
    : `tore down ${l.count} barricade${l.count > 1 ? 's' : ''}`).join(', ').replace(/^./, c => c.toUpperCase()) + '.';
}

export function raidPendingSheet(): void {
  sheet(close => h('div.stack', h('h2', 'Raiders at the gate'), h('p', 'Loot runs are blocked until you defend the factory.'),
    h('button.btn.primary.block', { onclick: () => { close(); location.hash = '#defence'; } }, 'Go to Defence')));
}
