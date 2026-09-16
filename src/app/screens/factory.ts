import { h, svg } from '../dom';
import { store } from '../store';
import { act, armed, bagChips, costChips, icon, liveSheet, longPress, sheet, stepper } from '../ui';
import { buildingArt, raidArt, solarArt, traderArt, turretArt } from '../../art/nodes';
import { go } from '../main';
import { belt, beltItems, emptyPad, environment, floorDefs, pad, stockRack } from '../../art/floor';
import { isBuildingId, isTurretId, openBuildingInfo, openTurretInfo } from './info';
import {
  BUILDINGS, BUILDING_IDS, C, INFRA, RESOURCES, SOLAR_PANEL, TURRETS, TURRET_COMBAT, TURRET_IDS, ZONES,
  activeDrain, activeRecipes, beltCapacity, beltUpgradeCost, buildingBlocker, buildingLabel, dailyEnergyBalance, factorySize, freshRaid, hasTech, haulingLabor, nextFactorySize,
  slotIsWall, solarCap, staleConveyors, timesAffordable, workshopUnlocked,
  type BuildingInst, type Conveyor, type NodeRef, type RaidRecord, type ResourceId, type ResourceTier, type State, type TurretInst,
} from '../../engine';

type Mode = 'view' | 'arrange' | 'connect';
const SEEN_KEY = 'fitnessfactory_seen_raid';
const ui: { mode: Mode; sel: number | null; selNode: NodeRef | null; seenRaidAt: number } =
  { mode: 'view', sel: null, selNode: null, seenRaidAt: Number(localStorage.getItem(SEEN_KEY) ?? 0) };
const markSeen = (at: number) => { ui.seenRaidAt = at; try { localStorage.setItem(SEEN_KEY, String(at)); } catch { /* ignore */ } };

// Geometry (SVG units)
const BW = 96, BH = 64, GX = 12, GY = 36, COLS = 4, PAD = 32;
/** Belt lane: horizontal runs sit this far below a row's boxes (under the label). */
const LANE = 26;
const W = PAD * 2 + COLS * BW + (COLS - 1) * GX;

interface Placed { x: number; y: number; ref: NodeRef; slot?: number; w?: number; h?: number }

export function renderFactory(s: State): Node {
  const size = factorySize(s);
  const rows = Math.ceil(size.interior / COLS);
  const roomTop = 10;
  const stockY = roomTop + 22;
  const gridY = stockY + BH + 14 + GY;
  const wallY = gridY + rows * (BH + GY);
  const rampartY = wallY - 10;
  const lineY = wallY + BH + LANE + 6;
  const outY = lineY + 32;
  const H = outY + BH + PAD + 8;
  const gateX = PAD / 2 + 1;

  const nodes: Placed[] = [];
  const slotPos = (i: number): { x: number; y: number } => {
    if (!slotIsWall(s, i)) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const rowCount = Math.min(COLS, size.interior - row * COLS);
      const rowW = rowCount * BW + (rowCount - 1) * GX;
      return { x: (W - rowW) / 2 + col * (BW + GX), y: gridY + row * (BH + GY) };
    }
    const wi = i - size.interior;
    const rowW = size.wall * BW + (size.wall - 1) * GX;
    return { x: (W - rowW) / 2 + wi * (BW + GX), y: wallY };
  };
  const SW = BW * 2 + GX, SH = BH + 14;
  const stock: Placed = { x: (W - SW) / 2, y: stockY, ref: { kind: 'stock' }, w: SW, h: SH };
  const trader: Placed = { x: (W - BW) / 2 - BW / 2 - GX, y: outY, ref: { kind: 'trader' } };
  const raidBox = { x: (W - BW) / 2 + BW / 2 + GX, y: outY };
  nodes.push(stock, trader);

  const parts: string[] = [];
  parts.push(environment({ W, H, roomTop, rampartY, lineY, gateX, corridorX: gateX, stock: { x: (W - (BW * 2 + GX)) / 2, y: stockY, w: BW * 2 + GX, h: BH + 14 } }));

  // Slots
  s.slots.forEach((entry, i) => {
    const { x, y } = slotPos(i);
    const wall = slotIsWall(s, i);
    const sel = ui.sel === i;
    if (!entry) {
      parts.push(`<g data-slot="${i}" class="node-hit">${emptyPad(x, y, BW, BH, wall ? 'turret' : 'build', sel)}<rect x="${x}" y="${y}" width="${BW}" height="${BH}" class="node-hit"/></g>`);
      return;
    }
    const ref: NodeRef = entry.kind === 'building' ? { kind: 'building', iid: entry.iid } : { kind: 'turret', iid: entry.iid };
    nodes.push({ x, y, ref, slot: i });
    let art = '', label = '', sub = '';
    if (entry.kind === 'building') {
      const b = s.buildings[entry.iid]!;
      art = buildingArt(b.def, b.upgrade);
      label = buildingLabel(s, entry.iid);
      const drain = activeDrain(b);
      sub = drain ? `−${drain} Energy/day` : '';
    } else {
      const t = s.turrets[entry.iid]!;
      art = turretArt(t.def);
      label = TURRETS[t.def].name;
      sub = `ammo ${t.ammo}/${C.AMMO_CAP}`;
    }
    const dark = entry.kind === 'building' && s.energy <= 0;
    const idle = dark ? ' anim-idle-off' : '';
    parts.push(`<g data-slot="${i}" class="node${idle}">${pad(x, y, BW, BH, sel ? 'sel' : dark ? 'dark' : 'normal')}` +
      `<g transform="translate(${x},${y}) scale(${BW / 96})">${art}</g>` +
      (entry.kind === 'turret' ? ammoBar(x, y, s.turrets[entry.iid]!) : '') +
      `<text x="${x + BW / 2}" y="${y + BH + 12}" text-anchor="middle" class="node-label">${esc(label)}</text>` +
      `<title>${esc(sub)}</title>` +
      `<rect x="${x}" y="${y}" width="${BW}" height="${BH}" class="node-hit"/></g>`);
  });

  // Fixed nodes
  const fixedSel = (r: NodeRef): 'sel' | 'normal' => (ui.selNode && ui.selNode.kind === r.kind ? 'sel' : 'normal');
  parts.push(`<g data-node="stock">${pad(stock.x, stock.y, SW, SH, fixedSel(stock.ref))}${stockRack(s, stock.x, stock.y, SW, SH)}` +
    `<text x="${stock.x + SW / 2}" y="${stock.y - 6}" text-anchor="middle" class="node-label">Stockpile</text><rect x="${stock.x}" y="${stock.y}" width="${SW}" height="${SH}" class="node-hit"/></g>`);
  parts.push(`<g data-node="trader">${pad(trader.x, trader.y, BW, BH, fixedSel(trader.ref))}<g transform="translate(${trader.x},${trader.y})">${traderArt()}</g>` +
    `<text x="${trader.x + BW / 2}" y="${trader.y + BH + 12}" text-anchor="middle" class="node-label">Trader</text><rect x="${trader.x}" y="${trader.y}" width="${BW}" height="${BH}" class="node-hit"/></g>`);
  for (let i = 0; i < s.solar; i++) {
    parts.push(`<g transform="translate(${W - PAD - 40 - i * 40},${roomTop + 6}) scale(0.42)">${solarArt()}</g>`);
  }
  if (s.solar) parts.push(`<text x="${W - PAD}" y="${roomTop + 46}" text-anchor="end" class="node-sub">roof +${s.solar * SOLAR_PANEL.energyPerDay}/day</text>`);
  const fr = freshRaid(s);
  const unseen = fr && fr.at !== ui.seenRaidAt;
  const pending = !!s.pendingRaid && !s.pendingRaid.fight.done;
  const raidMode = pending ? 'breach' : fr ? (fr.outcome.repelled ? 'repelled' : 'breach') : 'quiet';
  const raidLabel = pending ? 'At the gate!' : fr ? (fr.outcome.repelled ? 'Repelled' : 'Breached') : 'Quiet';
  parts.push(`<g data-node="raid" class="${pending ? 'anim-shake' : fr ? 'anim-pop' : ''}"><g transform="translate(${raidBox.x},${raidBox.y})">${raidArt(raidMode)}</g>` +
    `<text x="${raidBox.x + BW / 2}" y="${raidBox.y + BH + 12}" text-anchor="middle" class="node-label" style="fill:${pending ? 'var(--danger)' : fr ? (fr.outcome.repelled ? 'var(--ok)' : 'var(--danger)') : 'var(--ink-dim)'}">${raidLabel}</text><rect x="${raidBox.x}" y="${raidBox.y}" width="${BW}" height="${BH}" class="node-hit"/></g>`);

  // Belts (drawn under nodes → prepend)
  const stale = new Set(staleConveyors(s).map(c => c.id));
  const belts = s.conveyors.map((c, i) => beltMarkup(c, nodes, stale.has(c.id), i, lineY)).join('');
  // Belts render above the environment but below the nodes.
  const env = parts.shift()!;
  const floor = svg(`<svg class="floor" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${floorDefs()}${env}${belts}${parts.join('')}</svg>`) as SVGSVGElement;
  floor.addEventListener('click', e => onFloorTap(e, s));
  longPress(floor, target => {
    const g = target.closest('[data-slot]') as HTMLElement | null;
    if (!g) return;
    const entry = s.slots[Number(g.dataset.slot)];
    if (!entry) return;
    if (entry.kind === 'building') openBuildingInfo(s.buildings[entry.iid]!.def); else openTurretInfo(s.turrets[entry.iid]!.def);
  });
  const solarMax = solarCap(s);

  const eb = dailyEnergyBalance(s);
  const next = nextFactorySize(s);
  const wsUnlocked = workshopUnlocked(s);

  return h('div.stack',
    modeBar(s),
    floor,
    hint(),
    pending && h('div.notice.danger.row.between', h('span', h('b', 'Raiders at the gate.'), ' Loot runs are blocked until you defend.'), h('button.btn.sm', { onclick: () => go('defence') }, 'Defend')),
    unseen && fr && !pending && h(`div.notice.${fr.outcome.repelled ? 'ok' : 'danger'}.stack`,
      h('p', 'Raiders followed your tracks back and assaulted your base while you were gone.'),
      h('p.small', raidLine(fr)),
      h('button.btn.sm', { onclick: () => { markSeen(fr.at); store.refresh(); } }, 'Got it')),
    s.energy <= 0 && h('div.notice.danger', 'No Energy — the floor is dark. Log a flexibility session, or buy an emergency quota in Trade.'),
    h('div.card.row.between',
      h('div', h('div.small.dim', 'Energy per day'), h('div', h('b', { className: eb.net < 0 ? 'c-strength' : 'c-energy' }, `${eb.net > 0 ? '+' : ''}${eb.net}`), h('span.dim.small', `  (−${eb.drain} drain, +${eb.solar} solar)`))),
      h('div', { style: { textAlign: 'right' } }, h('div.small.dim', 'Factory size'), h('div', h('b', `${size.interior} + ${size.wall} wall`)))),
    next && h('div.card.stack', h('div.row.between', h('h3', `Expand to ${next.interior} + ${next.wall} wall`), h('button.btn.sm', { onclick: () => act({ type: 'upgrade_factory' }) }, 'Expand')), costChips(s, { res: next.cost, gold: next.gold })),
    h('div.card.stack', h('h3', 'Infrastructure'), h('p.dim.small', wsUnlocked ? 'Workshop floor is open.' : 'Workshop floor opens with 2 main-floor buildings or 3 delivered contracts.'),
      (Object.keys(INFRA) as Array<keyof typeof INFRA>).map(id => {
        const d = INFRA[id]; const built = s.infra.includes(id);
        return h('div.row.between', h('div', h('div', d.name, built && h('span.c-energy', ' ✓')), !built && costChips(s, d.cost)), !built && h('button.btn.sm', { onclick: () => act({ type: 'build_infra', infra: id }) }, 'Build'));
      }),
      h('div.row.between',
        h('div', h('div', `${SOLAR_PANEL.name}s  ${s.solar} / ${solarMax}`), h('div.dim.small', `On the roof, no slot needed. +${SOLAR_PANEL.energyPerDay} Energy/day each; bigger factories hold more.`), s.solar < solarMax && costChips(s, SOLAR_PANEL.cost)),
        s.solar < solarMax && h('button.btn.sm', { onclick: () => act({ type: 'build_solar' }) }, 'Add'))),
    s.raidHistory.length > 0 && h('button.btn.block', { onclick: () => openRaidHistory() }, `Raid log (${s.raidHistory.length})`),
  );
}

function ammoBar(x: number, y: number, t: TurretInst): string {
  const w = BW - 12, f = Math.round(w * t.ammo / C.AMMO_CAP);
  return `<rect x="${x + 6}" y="${y + BH - 6}" width="${w}" height="3" rx="1.5" class="ammo-bar"/><rect x="${x + 6}" y="${y + BH - 6}" width="${f}" height="3" rx="1.5" class="ammo-fill"/>`;
}

function beltMarkup(c: Conveyor, nodes: Placed[], stale: boolean, idx: number, lineY: number): string {
  const find = (r: NodeRef) => nodes.find(n => n.ref.kind === r.kind && ('iid' in r ? ('iid' in n.ref && n.ref.iid === r.iid) : true));
  const a = find(c.from), b = find(c.to);
  if (!a || !b) return '';
  const off = (idx % 3 - 1) * 5; // spread parallel belts
  const pts: Array<[number, number]> = [];
  const aw = a.w ?? BW, ah = a.h ?? BH, bw = b.w ?? BW;
  const ax = a.x + aw / 2 + off, bx = b.x + bw / 2 + off;
  if (c.to.kind === 'trader') {
    // Shipping lane: down into the lane, west to the gutter, south past the wall, east into the Trader.
    const gutter = PAD / 2 + off / 2;
    pts.push([ax, a.y + ah], [ax, a.y + ah + LANE], [gutter, a.y + ah + LANE], [gutter, b.y + BH / 2 + off], [b.x, b.y + BH / 2 + off]);
  } else if (b.y > a.y) {
    const laneA = a.y + ah + LANE, laneB = b.y - GY + LANE; // lane under source row / lane just above target row
    if (laneB - laneA < 1) pts.push([ax, a.y + ah], [ax, laneA], [bx, laneA], [bx, b.y]);
    else { // skips a row: detour via the nearest gutter so no box is crossed
      const gutter = (ax + bx) / 2 < W / 2 ? PAD / 2 + off : W - PAD / 2 + off;
      pts.push([ax, a.y + ah], [ax, laneA], [gutter, laneA], [gutter, laneB], [bx, laneB], [bx, b.y]);
    }
  } else if (b.y < a.y) {
    const laneA = a.y - GY + LANE, laneB = b.y + BH + LANE;
    if (laneA - laneB < 1) pts.push([ax, a.y], [ax, laneB], [bx, laneB], [bx, b.y + BH]);
    else {
      const gutter = (ax + bx) / 2 < W / 2 ? PAD / 2 + off : W - PAD / 2 + off;
      pts.push([ax, a.y], [ax, laneA], [gutter, laneA], [gutter, laneB], [bx, laneB], [bx, b.y + BH]);
    }
  } else {
    // Same row: out the bottom, along the lane, up into the target.
    pts.push([ax, a.y + BH], [ax, a.y + BH + LANE], [bx, a.y + BH + LANE], [bx, b.y + BH]);
  }
  const d = rounded(pts, 10);
  const id = `belt${idx}`;
  void lineY;
  return `<g class="belt-g" data-belt="${c.id}">${belt(d, id, stale, c.tier)}${beltItems(id, c.resource, beltCapacity(c))}</g>`;
}
/** Polyline with rounded corners. */
function rounded(pts: Array<[number, number]>, r: number): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0]![0]} ${pts[0]![1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]!, [cx, cy] = pts[i]!, [nx, ny] = pts[i + 1]!;
    const d1 = Math.hypot(cx - px, cy - py), d2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const inx = cx - (cx - px) / d1 * rr, iny = cy - (cy - py) / d1 * rr;
    const outx = cx + (nx - cx) / d2 * rr, outy = cy + (ny - cy) / d2 * rr;
    d += ` L${inx} ${iny} Q${cx} ${cy} ${outx} ${outy}`;
  }
  const [lx, ly] = pts[pts.length - 1]!;
  return d + ` L${lx} ${ly}`;
}

function modeBar(s: State): Node {
  const btn = (m: Mode, label: string, disabled = false) =>
    h(`button.btn.sm${ui.mode === m ? '.on' : ''}`, { disabled, onclick: () => { ui.mode = ui.mode === m ? 'view' : m; ui.sel = null; ui.selNode = null; store.refresh(); } }, label);
  return h('div.row.between',
    h('h2', 'Factory floor'),
    h('div.seg.c2', { style: { gap: '6px' } },
      btn('arrange', 'Arrange'),
      btn('connect', 'Connect', !hasTech(s, 'conveyor_systems'))));
}
function hint(): Node | null {
  if (ui.mode === 'arrange') return h('div.notice', ui.sel === null ? 'Arrange: tap a slot, then tap where it should go. Belts attached to moved things are removed.' : 'Now tap the destination slot.');
  if (ui.mode === 'connect') return h('div.notice', !ui.selNode ? 'Connect: tap where the goods come from (Stockpile or a building).' : 'Now tap where they go (a building, a turret, or the Trader).');
  return null;
}

function onFloorTap(e: Event, s: State): void {
  const g = (e.target as Element).closest('[data-slot],[data-node]') as HTMLElement | null;
  if (!g) return;
  const slot = g.dataset.slot !== undefined ? Number(g.dataset.slot) : null;
  const fixed = g.dataset.node;

  if (ui.mode === 'arrange') {
    if (slot === null) return;
    if (ui.sel === null) { ui.sel = slot; store.refresh(); return; }
    const from = ui.sel; ui.sel = null; ui.mode = 'view';
    act({ type: 'move', from, to: slot });
    return;
  }
  if (ui.mode === 'connect') {
    const ref = refFor(s, slot, fixed);
    if (!ref) return;
    if (!ui.selNode) { ui.selNode = ref; ui.sel = slot; store.refresh(); return; }
    const from = ui.selNode; ui.selNode = null; ui.sel = null; ui.mode = 'view';
    store.refresh();
    openConnectSheet(s, from, ref);
    return;
  }
  if (fixed === 'raid') { if (s.pendingRaid && !s.pendingRaid.fight.done) { go('defence'); return; } const fr = freshRaid(s); if (fr) markSeen(fr.at); openRaidHistory(); return; }
  if (fixed === 'stock') { openStockSheet(); return; }
  if (fixed === 'trader') { go('trade'); return; }
  if (slot === null) return;
  const entry = s.slots[slot];
  if (!entry) { openBuildSheet(s, slot); return; }
  if (entry.kind === 'building') openBuildingSheet(entry.iid); else openTurretSheet(entry.iid);
}
function refFor(s: State, slot: number | null, fixed: string | undefined): NodeRef | null {
  if (fixed === 'stock') return { kind: 'stock' };
  if (fixed === 'trader') return { kind: 'trader' };
  if (slot === null) return null;
  const e = s.slots[slot];
  if (!e) return null;
  return e.kind === 'building' ? { kind: 'building', iid: e.iid } : { kind: 'turret', iid: e.iid };
}

// ---------------------------------------------------------------- sheets
function openBuildSheet(s: State, slot: number): void {
  const wall = slotIsWall(s, slot);
  sheet(close => h('div.stack',
    h('h2', wall ? 'Place a turret' : 'Build'),
    wall ? TURRET_IDS.map(id => {
      const d = TURRETS[id];
      const card = h('div.card.flat.stack.pressable',
        h('div.row.between', h('div', h('b', d.name), h('div.dim.small', `range ${TURRET_COMBAT[id].range} · ${TURRET_COMBAT[id].damage} dmg × ${TURRET_COMBAT[id].rate}/tick · fires ${RESOURCES[d.ammo].name}`)),
          h('button.btn.sm', { onclick: () => { if (act({ type: 'build_turret', turret: id, slot })) close(); } }, 'Place')),
        costChips(s, d.cost));
      longPress(card, () => openTurretInfo(id));
      return card;
    }) : BUILDING_IDS.map(id => {
      const d = BUILDINGS[id];
      const blocker = buildingBlocker(s, d);
      const have = Object.values(s.buildings).filter(b => b.def === id).length;
      const card = h(`div.card.flat.stack.pressable${blocker ? '.locked' : ''}`,
        h('div.row.between',
          h('div', h('b', d.name, have > 0 && h('span.dim.small', `  (you have ${have})`)), h('div.dim.small', d.recipes.map(r => `${r.name} (${r.labor}L ${r.energy}E)`).join(' · '))),
          h('button.btn.sm', { disabled: !!blocker, onclick: () => { if (act({ type: 'build', building: id, slot })) close(); } }, 'Build')),
        blocker ? h('div.small.c-strength', blocker) : costChips(s, d.cost));
      longPress(card, () => openBuildingInfo(id));
      return card;
    }),
    h('p.dim.small', 'Hold a card for the full story: recipes, what feeds it, what it feeds.'),
    !wall && h('p.dim.small', 'Turrets go on the wall row. Buildings can spill into wall slots when the interior is full.'),
  ));
}

function openBuildingSheet(iid: string): void {
  const draw = (close: () => void) => {
    const s = store.state;
    const b = s.buildings[iid];
    if (!b) { close(); return h('div'); }
    const def = BUILDINGS[b.def];
    const belts = s.conveyors.filter(c => touches(c, 'building', iid));
    return h('div.stack',
      h('div.row', svg(`<svg width="96" height="64" viewBox="0 0 96 64">${buildingArt(b.def, b.upgrade)}</svg>`),
        h('div', h('h2', buildingLabel(s, iid)), h('div.dim.small', `${activeDrain(b)} Energy/day upkeep`))),
      activeRecipes(b).map(r => recipeRow(s, b, r.id)),
      !b.upgrade && def.upgrades.length > 0 && h('div.stack',
        h('h3', 'Choose a path (permanent)'),
        def.upgrades.map(up => h('div.card.flat.stack',
          h('div.row.between', h('div', h('b', up.name), h('div.dim.small', `${up.tagline} · ${up.recipes[0]!.labor}L ${up.recipes[0]!.energy}E per unit · ${up.drain}⚡/day`)),
            h('button.btn.sm', { onclick: () => act({ type: 'upgrade_building', iid, upgrade: up.id }) }, 'Upgrade')),
          costChips(s, up.cost)))),
      belts.length > 0 && h('div.stack', h('h3', 'Belts'), belts.map(c => beltRow(s, c))),
      armed('Demolish', () => { if (act({ type: 'demolish', kind: 'building', iid })) close(); }),
      h('p.dim.small', `Refunds 80% of the build cost as Gold, costs ${C.DEMOLISH_LABOR} Labor.`),
    );
  };
  liveSheet(draw);
}

function recipeRow(s: State, b: BuildingInst, recipeId: string): Node {
  const r = activeRecipes(b).find(x => x.id === recipeId)!;
  let max = Math.max(0, Math.min(timesAffordable(s.res, r.inputs), r.energy ? Math.floor(s.energy / r.energy) : 99, 99));
  while (max > 0 && r.labor * max + haulingLabor(s, b.iid, r, max) > s.labor) max--;
  let n = Math.min(Math.max(1, max), 5);
  const out = h('span.dim.small');
  const upd = () => { const haul = haulingLabor(s, b.iid, r, n); out.textContent = `→ ${bagText(r.output, n)} · costs ${r.labor * n + haul} Labor (${haul} hauling), ${r.energy * n} Energy`; };
  upd();
  const outIds = Object.keys(r.output) as ResourceId[];
  const stockLine = h('div.row.wrap', { style: { gap: '6px' } }, h('span.dim.small', 'In stock:'), outIds.map(id => h('span.chip', icon(id, 14), `${s.res[id]} ${RESOURCES[id].name}`)));
  const makeBtn = h('button.btn.primary', { disabled: max === 0, onclick: () => {
    if (act({ type: 'produce', iid: b.iid, recipe: r.id, units: n })) {
      navigator.vibrate?.(25);
      const float = h('span.float-gain', `+${bagText(r.output, n)}`);
      makeBtn.append(float); setTimeout(() => float.remove(), 1200);
    }
  } }, 'Make');
  return h('div.card.flat.stack',
    h('div.row.between', h('b', r.name), h('span.dim.small', `can make ${max}`)),
    h('div.row', bagChips(r.inputs), h('span.dim', '→'), bagChips(r.output), r.bonus && h('span.chip.c-gold', `${Math.round(r.bonus.chance * 100)}% bonus ${RESOURCES[r.bonus.resource].name}`)),
    h('div.row', h('div', { style: { flex: '1' } }, stepper(n, 1, Math.max(1, max), v => { n = v; upd(); })), makeBtn),
    out, stockLine);
}

function openTurretSheet(iid: string): void {
  const draw = (close: () => void) => {
    const s = store.state;
    const t = s.turrets[iid];
    if (!t) { close(); return h('div'); }
    const d = TURRETS[t.def];
    const belts = s.conveyors.filter(c => touches(c, 'turret', iid));
    return h('div.stack',
      h('div.row', svg(`<svg width="96" height="64" viewBox="0 0 96 64">${turretArt(t.def)}</svg>`),
        h('div', h('h2', d.name), h('div.dim.small', `${d.blurb} Place it on the Defence tab.`))),
      h('div', h('div.row.between.small', h('span', 'Ammo'), h('span', `${t.ammo} / ${C.AMMO_CAP} ${RESOURCES[d.ammo].name}`)), h('div.bar', h('i', { style: { width: `${t.ammo / C.AMMO_CAP * 100}%` } }))),
      h('div.seg.c2', h('button.btn.primary', { onclick: () => act({ type: 'load_ammo', iid }) }, `Load ${C.AMMO_LOAD_AMOUNT}`), h('button.btn', { onclick: () => act({ type: 'load_ammo', iid, fill: true }) }, `Fill (have ${s.res[d.ammo]})`)),
      belts.length > 0 && h('div.stack', h('h3', 'Belts'), belts.map(c => beltRow(s, c))),
      armed('Demolish', () => { if (act({ type: 'demolish', kind: 'turret', iid })) close(); }),
    );
  };
  liveSheet(draw);
}

function openConnectSheet(s: State, from: NodeRef, to: NodeRef): void {
  // Candidate resources: what `from` can supply ∩ what `to` accepts.
  let supply: ResourceId[] = from.kind === 'stock' ? (Object.keys(RESOURCES) as ResourceId[]) : [];
  if (from.kind === 'building') { const b = s.buildings[from.iid]; supply = b ? activeRecipes(b).flatMap(r => Object.keys(r.output) as ResourceId[]) : []; }
  let accept: ResourceId[] = supply;
  if (to.kind === 'building') { const b = s.buildings[to.iid]; accept = b ? activeRecipes(b).flatMap(r => Object.keys(r.inputs) as ResourceId[]) : []; }
  if (to.kind === 'turret') { const t = s.turrets[to.iid]; accept = t ? [TURRETS[t.def].ammo] : []; }
  const options = [...new Set(supply.filter(r => accept.includes(r)))];
  let resource: ResourceId | null = options[0] ?? null;
  sheet(close => h('div.stack',
    h('h2', 'New belt'),
    h('p.dim.small', `${nodeName(s, from)} → ${nodeName(s, to)}`),
    options.length === 0 ? h('div.empty', 'Nothing can travel between these two.') : h('div.stack',
      h('div.field', h('label', 'Carries'), h('div.seg.c2', options.map(r => h(`button.btn.sm${resource === r ? '.on' : ''}`, { onclick: (e: Event) => { resource = r; (e.currentTarget as HTMLElement).parentElement!.querySelectorAll('.btn').forEach(b => b.classList.remove('on')); (e.currentTarget as HTMLElement).classList.add('on'); } }, icon(r, 14), RESOURCES[r].name)))),
      h('p.dim.small', `A new belt is tier 1: ${C.BELT_CAPACITY[0]} units a day. ${to.kind === 'trader' ? 'It sells them.' : to.kind === 'turret' ? 'It tops up ammo.' : 'It runs the recipe that often, as far as Labor, Energy and materials allow — and the machine no longer pays hauling for this resource.'} Upgrade it later from the machine's sheet.`),
      h('button.btn.primary.block', { onclick: () => { if (resource && act({ type: 'add_conveyor', from, to, resource })) close(); } }, 'Lay belt')),
  ));
}

function beltRow(s: State, c: Conveyor): Node {
  const cost = beltUpgradeCost(c);
  return h('div.card.flat.stack', { style: { gap: '6px' } },
    h('div.row.between.small',
      h('span', icon(c.resource, 14), ` ${nodeName(s, c.from)} → ${nodeName(s, c.to)}`),
      h('span.dim', `Tier ${c.tier} · ${beltCapacity(c)}/day`)),
    h('div.row.between',
      cost ? costChips(s, { res: cost.res, gold: cost.gold }) : h('span.dim.small', 'Top tier'),
      h('div.row', cost && h('button.btn.sm', { onclick: () => act({ type: 'upgrade_conveyor', id: c.id }) }, `Upgrade → ${(C.BELT_CAPACITY as readonly number[])[c.tier] ?? ''}/day`),
        h('button.btn.sm', { onclick: () => act({ type: 'remove_conveyor', id: c.id }) }, 'Remove'))));
}

const STOCK_GROUPS: Array<{ tier: ResourceTier; title: string; blurb: string }> = [
  { tier: 'raw', title: 'Raw', blurb: 'From cardio. Feeds the main floor.' },
  { tier: 'premium', title: 'Premium', blurb: 'Rare cardio finds. Refinery and Lapidary.' },
  { tier: 'rare', title: 'Rare', blurb: 'Hardened Steel — loot luck or the Foundry.' },
  { tier: 'refined', title: 'Refined', blurb: 'Made here. Build with it or sell it.' },
  { tier: 'ammo', title: 'Ammunition', blurb: 'For the wall.' },
];
function openStockSheet(): void {
  liveSheet(close => {
    const s = store.state;
    const all = (Object.keys(RESOURCES) as ResourceId[]);
    const total = all.reduce((a, id) => a + s.res[id], 0);
    const value = all.reduce((a, id) => a + s.res[id] * RESOURCES[id].sell, 0);
    const belts = s.conveyors.filter(c => c.from.kind === 'stock');
    return h('div.stack',
      h('div.shop-head', h('div', h('h2', 'Stockpile'), h('p.dim.small', `${total} units on the shelves · worth ${value} Gold at the Trader`)),
        h('button.btn.sm', { onclick: () => { close(); go('trade'); } }, 'Sell')),
      total === 0 ? h('div.empty', 'Nothing here yet. Cardio brings loot.') :
        STOCK_GROUPS.map(g => {
          const ids = all.filter(id => RESOURCES[id].tier === g.tier && s.res[id] > 0);
          if (ids.length === 0) return null;
          const sub = ids.reduce((a, id) => a + s.res[id], 0);
          return h('div.card.flat.stack', { style: { gap: '8px' } },
            h('div.row.between', h('div', h('div.shop-group.dim.small', g.title), h('div.dim.small', g.blurb)), h('b.dim', `${sub}`)),
            h('div.res-list', ids.map(id => h('div.res', icon(id), RESOURCES[id].name, h('b', String(s.res[id]))))));
        }),
      belts.length > 0 && h('div.card.flat.stack', h('h3', 'Belts out'), belts.map(c => beltRow(s, c))));
  });
}
function openRaidHistory(): void {
  const s = store.state;
  sheet(() => h('div.stack', h('h2', 'Raid log'),
    s.raidHistory.length === 0 ? h('div.empty', 'No raids yet. The first 5 successful loot runs are always safe.') :
      s.raidHistory.map(r => h(`div.card.flat.stack`, { style: { borderColor: r.outcome.repelled ? 'var(--ok)' : 'var(--danger)' } },
        h('div.row.between', h('b', r.outcome.repelled ? 'Repelled' : 'Breached'), h('span.dim.small', new Date(r.at).toLocaleDateString())),
        h('p.small', raidLine(r))))));
}

function raidLine(r: RaidRecord): string {
  const zone = ZONES.find(z => z.tier === r.zoneTier)?.name ?? `tier ${r.zoneTier}`;
  const crew = r.wave.map(w => `${w.count} ${w.type}${w.count > 1 ? 's' : ''}`).join(', ');
  const o = r.outcome;
  const base = `${crew} from ${zone}. ${o.killed} killed in ${o.ticks} ticks.`;
  if (o.repelled) { const d = Object.entries(o.drops).map(([id, n]) => `${n} ${RESOURCES[id as ResourceId].name}`).join(', '); return `${base}${d ? ` They dropped ${d}.` : ''}`; }
  const loss = o.loss?.kind === 'steal' ? `They took ${o.loss.amount} ${RESOURCES[o.loss.resource].name}.`
    : o.loss?.kind === 'turret' ? `They wrecked your ${TURRETS[o.loss.def].name}.`
    : o.loss?.kind === 'building' ? `They wrecked your ${BUILDINGS[o.loss.def].name}.` : 'Nothing worth taking.';
  return `${base} ${o.breached} got through. ${loss}`;
}

const touches = (c: Conveyor, kind: string, iid: string) =>
  (c.from.kind === kind && 'iid' in c.from && c.from.iid === iid) || (c.to.kind === kind && 'iid' in c.to && c.to.iid === iid);
function nodeName(s: State, r: NodeRef): string {
  if (r.kind === 'stock') return 'Stockpile';
  if (r.kind === 'trader') return 'Trader';
  if (r.kind === 'building') return buildingLabel(s, r.iid);
  const t = s.turrets[r.iid]; return t ? TURRETS[t.def].name : '?';
}
const bagText = (b: Partial<Record<ResourceId, number>>, times: number) =>
  (Object.entries(b) as Array<[ResourceId, number]>).map(([id, n]) => `${n * times} ${RESOURCES[id].name}`).join(', ');
const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
