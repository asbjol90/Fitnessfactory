import { h, svg } from '../dom';
import { store } from '../store';
import { act, bagChips, costChips, icon, sheet, toast } from '../ui';
import { floorDefs } from '../../art/floor';
import { placeableMark, rangeMark } from '../../art/defence';
import { CELL, barricadeTop as barricadeArt, fieldTile, gateTile, raiderTop, roadTile, turretTop, wallTile } from '../../art/defence2';
import {
  BARRICADE, GATE, GRID_COLS, GRID_ROWS, RAIDERS, RALLY, RESOURCES, TURRETS, TURRET_COMBAT, WALLS, ZONES, C,
  barricadeable, cellFromIndex, cellIndex, inRange, pathOf, placeable, waveDef, wallDef,
  type Fight, type Raider, type RaidOutcome, type State,
} from '../../engine';
import { openTurretInfo } from './info';
import { SFX, soundEnabled } from '../sfx';

type Mode = 'view' | 'barricade';
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
      !fighting && !fight?.done && h(`button.btn.sm${ui.mode === 'barricade' ? '.on' : ''}`, { onclick: () => { ui.mode = ui.mode === 'barricade' ? 'view' : 'barricade'; ui.pick = null; store.refresh(); } }, ui.mode === 'barricade' ? 'Done' : 'Barricades')),
    pr && !fight!.done && banner(s, fight!),
    field(s),
    fight?.done && result(s, fight.done),
    fighting && controls(s, fight!),
    !fighting && !fight?.done && hint(s),
    !fighting && !fight?.done && roster(s),
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

  const roadIdx = new Map(road.map((c, k) => [cellIndex(c), k]));
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    const { x, y } = cellXY(i);
    const c = cellFromIndex(i);
    if (c.r === GATE.r) parts.push(i === cellIndex(GATE) ? gateTile(x, y, wallMax ? (f ? f.wallHp : wallMax) / wallMax : -1).replace('class="gate-hp"', 'id="gate-hp"') : wallTile(x, y));
    else if (roadSet.has(i)) {
      const k = roadIdx.get(i)!; const prev = road[k - 1], next = road[k + 1];
      const dir = prev && next && prev.c !== next.c && prev.r !== next.r ? 'c' : (prev ?? next)!.c === road[k]!.c ? 'v' : 'h';
      parts.push(roadTile(x, y, dir, i));
    } else parts.push(fieldTile(x, y, i));
  }
  const entry = cellXY(cellIndex(road[0]!));
  parts.push(`<path d="M${entry.x + CELL / 2 - 8} ${entry.y + 6} l8 10 l8 -10" fill="none" stroke="var(--danger)" stroke-width="3"/>`);

  if (!f && ui.mode === 'view' && ui.pick) for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) if (placeable(s, i)) { const { x, y } = cellXY(i); parts.push(placeableMark(x, y, true)); }
  if (!f && ui.mode === 'barricade') for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) if (barricadeable(s, i)) { const { x, y } = cellXY(i); parts.push(placeableMark(x, y, true)); }
  const showRangeFor = ui.pick && s.turretCells[ui.pick] !== undefined ? ui.pick : null;
  if (showRangeFor) {
    const at = cellFromIndex(s.turretCells[showRangeFor]!);
    const r = TURRET_COMBAT[s.turrets[showRangeFor]!.def].range;
    for (const rc of road) if (inRange(at, rc, r)) { const { x, y } = cellXY(cellIndex(rc)); parts.push(rangeMark(x, y)); }
  }

  parts.push('<g id="barricades">');
  for (const b of s.barricades) { const { x, y } = cellXY(b.cell); parts.push(`<g data-barricade="${b.cell}">${barricadeArt(x, y, b.hp / BARRICADE.hp)}</g>`); }
  parts.push('</g><g id="turrets">');
  for (const [iid, cell] of Object.entries(s.turretCells)) {
    const t = s.turrets[iid]; if (!t) continue;
    const { x, y } = cellXY(cell);
    if (ui.angles[iid] === undefined) ui.angles[iid] = -90;
    const tstate = t.ammo < C.AMMO_PER_SHOT ? 'dry' : (f && f.tick > 0 && !f.done) ? 'track' : 'idle';
    parts.push(`<g data-turret="${iid}">${ui.pick === iid ? `<circle cx="${x + CELL / 2}" cy="${y + CELL / 2}" r="24" fill="none" stroke="var(--hazard)" stroke-width="2"/>` : ''}${turretTop(t.def, x, y, ui.angles[iid]!, tstate).replace(`style="transform:rotate(${ui.angles[iid]}deg)"`, `style="--a:${ui.angles[iid]}deg;transform:rotate(${ui.angles[iid]}deg)"`)}` +
      `<text data-ammo="${iid}" x="${x + CELL / 2}" y="${y + CELL - 2}" text-anchor="middle" class="node-sub" style="font-size:9px">${t.ammo}</text></g>`);
  }
  parts.push('</g><g id="fx"></g><g id="raiders">');
  if (f) for (const r of f.raiders) {
    if (!r.alive || r.pos < 0) continue;
    const p = raiderXY(road, r);
    const sc = f.raiders.length > 10 ? .8 : 1;
    parts.push(`<g data-raider="${r.id}" class="raider-g${r.breached ? ' breached' : ''}" style="transform:translate(${p.x}px,${p.y}px) scale(${sc})">${raiderTop(r.type, 0, 0, r.hp / r.maxHp)}</g>`);
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
      g.style.transform = `translate(${p.x}px,${p.y}px) scale(${f.raiders.length > 10 ? .8 : 1})`;
      g.style.opacity = '0';
      raidersLayer.append(g);
      requestAnimationFrame(() => { g!.style.opacity = '1'; });
      continue;
    }
    if (!g) continue;
    if (!r.alive) {
      if (!g.classList.contains('dying')) {
        g.classList.add('dying'); g.querySelector('.walker')?.classList.add('dying');
        const puff = document.createElementNS(NS, 'g'); puff.setAttribute('class', 'anim-smoke'); puff.style.transformOrigin = `${p.x}px ${p.y}px`;
        puff.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="9" fill="var(--smoke)"/>`; fx.append(puff);
        setTimeout(() => { g?.remove(); puff.remove(); }, 700);
      }
      continue;
    }
    g.style.transform = `translate(${p.x}px,${p.y}px) scale(${f.raiders.length > 10 ? .8 : 1})`;
    g.classList.toggle('breached', r.breached);
    const hpBar = g.querySelector('rect.hp'); const bg = hpBar?.previousElementSibling;
    if (hpBar && bg) hpBar.setAttribute('width', String(parseFloat(bg.getAttribute('width')!) * Math.max(0, r.hp / r.maxHp)));
    const w = g.querySelector('.walker');
    if (w) { const wasHit = f.last.shots.some(sh => sh.targetId === r.id) || (f.last.rally > 0 && r.pos >= road.length - 2); if (wasHit) { w.classList.remove('hit'); void (w as unknown as HTMLElement).getBoundingClientRect(); w.classList.add('hit'); } w.classList.toggle('still', r.breached); }
  }

  // Turrets: rotate toward target, flash, ammo count.
  for (const [iid, cell] of Object.entries(s.turretCells)) {
    const g = el.querySelector(`[data-turret="${iid}"]`) as SVGGElement | null; if (!g) continue;
    const shot = f.last.shots.find(sh => sh.turretIid === iid);
    const turretEl = g.querySelector('.turret') as SVGGElement | null;
    const t = s.turrets[iid];
    if (shot) {
      const target = f.raiders.find(r => r.id === shot.targetId);
      if (target) { const tp = raiderXY(road, target); const cc = center(cell); ui.angles[iid] = Math.atan2(tp.y - cc.y, tp.x - cc.x) * 180 / Math.PI; }
      if (turretEl) { const rapid = t && TURRET_COMBAT[t.def].rate >= 4 ? ' rapid' : ''; turretEl.setAttribute('class', 'turret t-track'); void (turretEl as unknown as HTMLElement).getBoundingClientRect(); turretEl.setAttribute('class', `turret t-fire${rapid}`); setTimeout(() => { if (turretEl.getAttribute('class')?.startsWith('turret t-fire')) turretEl.setAttribute('class', 'turret t-track'); }, rapid ? 600 : 320); }
    } else if (turretEl) {
      turretEl.setAttribute('class', `turret ${t && t.ammo < C.AMMO_PER_SHOT ? 't-dry' : f.done ? 't-idle' : 't-track'}`);
    }
    const barrel = g.querySelector('.barrel') as SVGGElement | null;
    if (barrel) { barrel.style.setProperty('--a', `${ui.angles[iid] ?? -90}deg`); barrel.style.transform = `rotate(${ui.angles[iid] ?? -90}deg)`; }
    const ammo = el.querySelector(`[data-ammo="${iid}"]`); if (ammo) ammo.textContent = String(s.turrets[iid]?.ammo ?? 0);
  }

  // Tracers and rally flash (short-lived).
  const seen = new Set<string>();
  for (const sh of f.last.shots) {
    const cell = s.turretCells[sh.turretIid]; const target = f.raiders.find(r => r.id === sh.targetId);
    if (cell === undefined || !target) continue;
    const rapid = TURRET_COMBAT[s.turrets[sh.turretIid]?.def ?? 'scrap_launcher'].rate >= 4;
    const key = `${sh.turretIid}:${sh.targetId}`; if (rapid && seen.has(key)) continue; seen.add(key);
    const a = center(cell), b = raiderXY(road, target);
    const n = rapid ? 4 : 1;
    for (let k = 0; k < n; k++) {
      const line = document.createElementNS(NS, 'line');
      const jx = rapid ? (k % 2 ? 3 : -3) : 0, jy = rapid ? (k < 2 ? -2 : 2) : 0;
      line.setAttribute('x1', String(a.x)); line.setAttribute('y1', String(a.y)); line.setAttribute('x2', String(b.x + jx)); line.setAttribute('y2', String(b.y + jy));
      line.setAttribute('stroke', 'var(--flame)'); line.setAttribute('stroke-width', rapid ? '1.2' : '2'); line.setAttribute('class', 'tracer');
      line.style.animationDelay = `${k * 0.12}s`;
      fx.append(line); setTimeout(() => line.remove(), 450 + k * 120);
    }
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
  // spread by id so they don't stack; wider spread for the bigger crews
  const jitter = ((r.id * 7) % 5 - 2) * 5;
  return { x: a.x + (b.x - a.x) * frac + jitter, y: a.y + (b.y - a.y) * frac + ((r.id * 3) % 3 - 1) * 5 };
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
  // Select-then-place: a selected turret (from the roster or the field) goes wherever you tap next.
  if (ui.pick) {
    if (turretHere === ui.pick) { ui.pick = null; store.refresh(); return; }          // tap it again: deselect
    if (turretHere) { ui.pick = turretHere; store.refresh(); return; }                // tap another: switch selection
    if (placeable(s, i)) { if (act({ type: 'place_turret', iid: ui.pick, cell: i })) ui.pick = null; return; }
    toast('Turrets stand on open ground beside the road.');
    return;
  }
  if (turretHere) { ui.pick = turretHere; store.refresh(); return; }
  ui.pick = null; store.refresh();
}

function roster(s: State): Node {
  const ts = Object.values(s.turrets);
  const fighting = !!s.pendingRaid && s.pendingRaid.fight.tick > 0 && !s.pendingRaid.fight.done;
  return h('div.card.stack',
    h('div.row.between', h('h3', 'Turrets'), h('span.dim.small', 'Bought on the Factory wall')),
    ts.length === 0 ? h('div.empty', 'No turrets yet.') :
      ts.map(t => {
        const placed = s.turretCells[t.iid] !== undefined;
        const cs = TURRET_COMBAT[t.def];
        const sel = ui.pick === t.iid;
        return h(`div.row.between.small.roster-row${sel ? '.picked' : ''}`, { onclick: () => { if (fighting) return; ui.pick = sel ? null : t.iid; store.refresh(); } },
          h('span', h('b', TURRETS[t.def].name), h('span.dim', ` · reach ${cs.range} · ${cs.damage}×${cs.rate}/tick · `), icon(TURRETS[t.def].ammo, 12), h('span.dim', ` ${t.ammo}`),
            h('div.dim', { style: { fontSize: '11px' } }, placed ? (sel ? 'Selected — tap a cell to move it' : 'On the field') : (sel ? 'Selected — tap a cell to place it' : 'Not placed'))),
          h('div.row',
            t.ammo < C.AMMO_CAP && s.res[TURRETS[t.def].ammo] > 0 && h('button.btn.sm', { onclick: (e: Event) => { e.stopPropagation(); act({ type: 'load_ammo', iid: t.iid, fill: true }); } }, 'Fill'),
            placed && !fighting && h('button.btn.sm', { onclick: (e: Event) => { e.stopPropagation(); if (ui.pick === t.iid) ui.pick = null; act({ type: 'unplace_turret', iid: t.iid }); } }, 'Pick up'),
            h('button.btn.sm', { onclick: (e: Event) => { e.stopPropagation(); openTurretInfo(t.def); } }, 'i')));
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
    h('p.dim.small', `A barricade costs ${BARRICADE.labor} Labor + 6 Stone, has ${BARRICADE.hp} HP, and stands until raiders break it. Rally costs ${RALLY.labor} Labor per use, hits for ${RALLY.damage} at the gate, and needs ${RALLY.cooldown} ticks to recover.`));
}

function wavePreview(s: State): Node {
  const reached = Math.max(1, s.maxZoneTierReached);
  return h('div.card.stack', h('h3', 'Who follows you home'),
    h('p.dim.small', 'A raid matches the zone you were looting when they picked up your trail. Deeper zones, bigger crews.'),
    ZONES.filter(z => z.tier <= reached).map(z => { const w = waveDef(z.tier); return h('div.row.between.small', h('span', z.name), h('span.dim', w.groups.map(g => `${g.count} ${RAIDERS[g.type].name.toLowerCase()}${g.count > 1 ? 's' : ''} (${g.hp})`).join(' · '))); }),
    h('p.dim.small', 'Raiders enter two per tick at the arrow and walk the road. Turrets shoot whoever is furthest along inside their range; every shot costs ammo.'));
}

function hint(s: State): Node | null {
  if (ui.mode === 'barricade') return h('div.notice', 'Tap a road cell to build a barricade. Tap a barricade to remove it. Done when finished.');
  if (ui.pick) return h('div.notice', `${TURRETS[s.turrets[ui.pick]?.def ?? 'scrap_launcher'].name} selected. Tap a highlighted cell to ${s.turretCells[ui.pick] !== undefined ? 'move' : 'place'} it, another turret to switch, or it again to deselect.`);
  if (Object.values(s.turrets).some(t => s.turretCells[t.iid] === undefined)) return h('div.notice', 'Tap a turret in the roster, then tap where it goes.');
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
  fightSounds(store.state);
  if (store.state.pendingRaid?.fight.done) stopTimer();
}
/** One tick of fight audio, budgeted so a big fight stays readable: ≤3 distinct gun voices, one hit or one down, gate, rally, verdict. */
function fightSounds(s: State): void {
  if (!soundEnabled()) return;
  const f = s.pendingRaid?.fight; if (!f) return;
  const walking = f.raiders.filter(r => r.alive && r.pos >= 0 && !r.breached).length;
  if (walking) SFX.march(walking);
  const voices = new Set<string>();
  for (const sh of f.last.shots) { const def = s.turrets[sh.turretIid]?.def; if (def && voices.size < 3) voices.add(def); }
  [...voices].forEach((def, i) => setTimeout(() => {
    if (def === 'scrap_launcher') SFX.mortar(); else if (def === 'shotgun') SFX.shotgun(); else if (def === 'assault_rifle') SFX.rifle(); else if (def === 'minigun') SFX.minigun(); else SFX.doubleMinigun();
  }, i * 90));
  if (f.last.kills.length) setTimeout(() => SFX.raiderDown(), 220); else if (f.last.shots.length) setTimeout(() => SFX.hit(), 160);
  if (f.last.wallHits) SFX.gateHit();
  if (f.last.rally) SFX.rally();
  if (f.done) setTimeout(() => (f.done!.repelled ? SFX.repelled() : SFX.breach()), 500);
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
