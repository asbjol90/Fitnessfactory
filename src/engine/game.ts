import type { Action, GameEvent } from './actions';
import { C } from './constants';
import { contractProgress, payContract, topUpContracts } from './contracts';
import { removeConveyorsTouching, validateConveyor } from './conveyors';
import { contractById } from './data/contracts';
import {
  AVATAR_IDS, FACTORY_SIZES, GEAR, GEAR_DROP_ZONES, HABITS, PREMIUM_WEIGHTS, RESOURCES, STAT_IDS, TECHS,
  zoneById, type Bag, type HabitId, type ResourceId, type StatId,
} from './data/core';
import { BUILDINGS, INFRA, SOLAR_PANEL, TURRETS, type Cost } from './data/factory';
import {
  beltUpgradeCost, buildingBlocker, effectiveLevel, energyBonus, freeSlots, gearUpgradeCost, laborBonus, lootBonus, naturalLevel,
  nextContractSlotPrice, nextFactorySize, sellBonus, sellLaborCost, slotIsWall, solarCap, statMult, techAvailable,
} from './derive';
import { GameError } from './errors';
import { runRecipe } from './production';
import { removeNode, shouldRaid } from './raids';
import { barricadeable, createRaid, placeable, tickRaid } from './defence';
import { BARRICADE, wallDef } from './data/defence';
import { addBag, clone, dayKey, emptyHabitCounts, hasBag, pick, subBag, weightedPick, type Rng, type Session, type State } from './state';
import { advanceTime } from './tick';

export interface Ctx { now: number; rng: Rng; }
export interface Result { state: State; events: GameEvent[]; error: string | null; }

/**
 * Pure reducer: never mutates the input. On a rule violation the original
 * state is returned untouched with `error` set — time-advance side effects
 * from the same call are also discarded, so the UI can simply retry.
 */
export function reduce(input: State, action: Action, ctx: Ctx): Result {
  const s = clone(input);
  const events: GameEvent[] = [];
  try {
    advanceTime(s, ctx.now, ctx.rng, events);
    apply(s, action, ctx, events);
    return { state: s, events, error: null };
  } catch (e) {
    if (e instanceof GameError) return { state: input, events: [], error: e.message };
    throw e;
  }
}

function apply(s: State, a: Action, ctx: Ctx, ev: GameEvent[]): void {
  switch (a.type) {
    case 'tick': return;
    case 'pick_avatar': return pickAvatar(s, a.id, a.name);
    case 'log_session': return logSession(s, a, ctx, ev);
    case 'log_habit': return logHabit(s, a.habit, ctx, ev);
    case 'build': return build(s, a.building, a.slot, ev);
    case 'upgrade_building': return upgradeBuilding(s, a.iid, a.upgrade, ev);
    case 'demolish': return demolish(s, a.kind, a.iid, ev);
    case 'produce': {
      const before = snapshotLevels(s);
      const r = runRecipe(s, a.iid, a.recipe, a.units, ctx.rng, true);
      ev.push({ type: 'produced', iid: a.iid, recipe: a.recipe, units: r.units, output: r.output, bonus: r.bonus });
      emitLevelUps(s, before, ev);
      return;
    }
    case 'sell': return sell(s, a.resource, a.units, ev);
    case 'buy': return buy(s, a.resource, a.units, ev);
    case 'build_turret': return buildTurret(s, a.turret, a.slot, ev);
    case 'load_ammo': return loadAmmo(s, a.iid, ev, a.fill ?? false);
    case 'move': return move(s, a.from, a.to, ev);
    case 'add_conveyor': return addConveyor(s, a, ev);
    case 'upgrade_conveyor': {
      const c = s.conveyors.find(c => c.id === a.id);
      if (!c) throw new GameError('That belt is gone.');
      const cost = beltUpgradeCost(c);
      if (!cost) throw new GameError('This belt is already top tier.');
      payCost(s, { res: cost.res, gold: cost.gold, labor: 0, research: 0 });
      c.tier = (c.tier + 1) as 1 | 2 | 3;
      ev.push({ type: 'conveyor', op: 'upgraded', id: c.id });
      return;
    }
    case 'remove_conveyor': {
      if (!s.conveyors.some(c => c.id === a.id)) throw new GameError('That belt is gone.');
      s.conveyors = s.conveyors.filter(c => c.id !== a.id);
      ev.push({ type: 'conveyor', op: 'removed', id: a.id });
      return;
    }
    case 'research': return research(s, a.tech, ctx, ev);
    case 'build_infra': return buildInfra(s, a.infra, ev);
    case 'build_solar': return buildSolar(s, ev);
    case 'upgrade_factory': return upgradeFactory(s, ev);
    case 'claim_contract': return claimContract(s, a.id, ev);
    case 'buy_contract_slot': return buyContractSlot(s, ctx, ev);
    case 'craft_gear': return craftGear(s, a.stat, ev);
    case 'emergency_energy': return emergencyEnergy(s, ev);
    case 'upgrade_wall': return upgradeWall(s, ev);
    case 'place_turret': {
      if (!s.turrets[a.iid]) throw new GameError('That turret is gone.');
      if (s.pendingRaid && !s.pendingRaid.fight.done && s.pendingRaid.fight.tick > 0) throw new GameError('Not while the fight is on.');
      delete s.turretCells[a.iid];
      if (!placeable(s, a.cell)) throw new GameError('Turrets stand beside the road, not on it.');
      s.turretCells[a.iid] = a.cell;
      ev.push({ type: 'turret_placed', iid: a.iid, cell: a.cell });
      return;
    }
    case 'unplace_turret': {
      if (s.pendingRaid && !s.pendingRaid.fight.done && s.pendingRaid.fight.tick > 0) throw new GameError('Not while the fight is on.');
      delete s.turretCells[a.iid];
      ev.push({ type: 'turret_placed', iid: a.iid, cell: null });
      return;
    }
    case 'build_barricade': {
      if (s.pendingRaid && !s.pendingRaid.fight.done && s.pendingRaid.fight.tick > 0) throw new GameError('Not while the fight is on.');
      if (s.barricades.length >= wallDef(s.wall).barricades) throw new GameError(`Your wall supports ${wallDef(s.wall).barricades} barricade${wallDef(s.wall).barricades > 1 ? 's' : ''}.`);
      if (!barricadeable(s, a.cell)) throw new GameError('Barricades go on the road, at least two steps from the gate.');
      if (s.labor < BARRICADE.labor) throw new GameError(`Needs ${BARRICADE.labor} Labor.`);
      if (!hasBag(s.res, BARRICADE.cost)) throw new GameError('Needs 6 Stone.');
      subBag(s.res, BARRICADE.cost); s.labor -= BARRICADE.labor; s.avatar.volume.strength += BARRICADE.labor;
      s.barricades.push({ cell: a.cell, hp: BARRICADE.hp });
      ev.push({ type: 'barricade', op: 'built', cell: a.cell });
      return;
    }
    case 'remove_barricade': {
      s.barricades = s.barricades.filter(b => b.cell !== a.cell);
      ev.push({ type: 'barricade', op: 'removed', cell: a.cell });
      return;
    }
    case 'raid_tick': {
      if (!s.pendingRaid) throw new GameError('No raid to fight.');
      if (s.pendingRaid.fight.done) { s.pendingRaid = null; return; }
      tickRaid(s, a.rally);
      if (s.pendingRaid.fight.done) ev.push({ type: 'raid', record: s.raidHistory[0]! });
      return;
    }
  }
}

// ---------------------------------------------------------------- Cost helpers
function assertCost(s: State, cost: Cost): void {
  if (!hasBag(s.res, cost.res)) throw new GameError('Not enough materials.');
  if (s.gold < cost.gold) throw new GameError(`Needs ${cost.gold} Gold.`);
  if (s.labor < cost.labor) throw new GameError(`Needs ${cost.labor} Labor.`);
  if (s.research < cost.research) throw new GameError(`Needs ${cost.research} Research.`);
}
function payCost(s: State, cost: Cost): void {
  assertCost(s, cost);
  subBag(s.res, cost.res);
  s.gold -= cost.gold;
  s.labor -= cost.labor;
  s.research -= cost.research;
  s.avatar.volume.strength += cost.labor;
}
/** Gold value of a cost, for demolish refunds. */
function costValue(cost: Cost): number {
  let v = cost.gold;
  for (const [id, n] of Object.entries(cost.res) as Array<[ResourceId, number]>) v += RESOURCES[id].sell * n;
  return v;
}
const newId = (s: State, prefix: string) => `${prefix}${s.nextId++}`;

// ---------------------------------------------------------------- Avatar
function pickAvatar(s: State, id: State['avatar']['id'], name: string): void {
  if (!id || !AVATAR_IDS.includes(id)) throw new GameError('Pick a character.');
  s.avatar.id = id;
  s.avatar.name = name.trim().slice(0, 24);
}

type Levels = Record<StatId, number>;
const snapshotLevels = (s: State): Levels =>
  Object.fromEntries(STAT_IDS.map(st => [st, naturalLevel(st, s.avatar.volume[st])])) as Levels;
function emitLevelUps(s: State, before: Levels, ev: GameEvent[]): void {
  for (const st of STAT_IDS) {
    const now = naturalLevel(st, s.avatar.volume[st]);
    if (now > before[st]) ev.push({ type: 'level_up', stat: st, level: now });
  }
}

function craftGear(s: State, stat: StatId, ev: GameEvent[]): void {
  const cost = gearUpgradeCost(s, stat);
  if (!cost) throw new GameError(`${GEAR[stat].name} is already at its best.`);
  if (s.res[cost.material] < cost.amount) throw new GameError(`Needs ${cost.amount} ${RESOURCES[cost.material].name}.`);
  s.res[cost.material] -= cost.amount;
  s.avatar.gear[stat]++;
  ev.push({ type: 'gear', stat, tier: s.avatar.gear[stat] });
}

// ---------------------------------------------------------------- Training
function logSession(s: State, a: Extract<Action, { type: 'log_session' }>, ctx: Ctx, ev: GameEvent[]): void {
  if (!s.avatar.id) throw new GameError('Pick a character first.');
  if (!Number.isFinite(a.minutes) || a.minutes < C.MINUTE_MIN) throw new GameError(`Sessions are at least ${C.MINUTE_MIN} minutes.`);
  if (!(a.intensity in C.INTENSITY_MULT)) throw new GameError('Choose an intensity.');
  const minutes = Math.round(a.minutes);
  const counted = Math.min(minutes, C.MINUTE_CAP[a.intensity]);
  const im = C.INTENSITY_MULT[a.intensity];

  const before = snapshotLevels(s);
  const session: Session = {
    at: ctx.now, kind: a.kind, minutes, intensity: a.intensity, result: '',
    ...(a.zone ? { zone: a.zone } : {}), ...(a.note ? { note: a.note } : {}),
  };
  ev.push({ type: 'session', kind: a.kind, minutes, counted });

  switch (a.kind) {
    case 'strength': {
      const labor = Math.max(1, Math.round(C.LABOR_K * counted * im * statMult(s, 'strength') * laborBonus(s)));
      s.labor += labor;
      s.weekly.laborEarned += labor;
      session.result = `+${labor} Labor`;
      ev.push({ type: 'gain', pool: 'labor', amount: labor });
      break;
    }
    case 'flexibility': {
      const energy = Math.max(1, Math.round(C.ENERGY_K * counted * im * statMult(s, 'energy') * energyBonus(s)));
      s.energy += energy;
      s.weekly.energyEarned += energy;
      s.avatar.volume.energy += counted;
      session.result = `+${energy} Energy`;
      ev.push({ type: 'gain', pool: 'energy', amount: energy });
      break;
    }
    case 'cardio': {
      if (!a.zone) throw new GameError('Choose a zone to loot.');
      if (s.pendingRaid && !s.pendingRaid.fight.done) throw new GameError('Raiders are at your gate. Defend the factory before the next run.');
      const r = cardioRun(s, counted, im, a.zone, ctx, ev);
      session.result = r.text;
      if (r.failed) session.failed = true;
      break;
    }
  }
  pushSession(s, session);
  emitLevelUps(s, before, ev);
}

function pushSession(s: State, session: Session): void {
  s.sessions.unshift(session);
  while (s.sessions.length > 300) {
    const old = s.sessions.pop()!;
    s.archived.sessions++;
    s.archived.minutes += old.minutes;
  }
}

function logHabit(s: State, habit: HabitId, ctx: Ctx, ev: GameEvent[]): void {
  if (!s.avatar.id) throw new GameError('Pick a character first.');
  const today = dayKey(ctx.now);
  if (s.nutrition.dayKey !== today) s.nutrition = { dayKey: today, counts: emptyHabitCounts() };
  const def = HABITS[habit];
  if (s.nutrition.counts[habit] >= def.dailyCap) throw new GameError(def.dailyCap === 1 ? 'Already logged today.' : `Max ${def.dailyCap} per day.`);
  const before = snapshotLevels(s);
  s.nutrition.counts[habit]++;
  const research = Math.max(1, Math.round(def.research * statMult(s, 'research')));
  s.research += research;
  s.avatar.volume.research += research;
  ev.push({ type: 'habit', habit, research });
  ev.push({ type: 'gain', pool: 'research', amount: research });
  emitLevelUps(s, before, ev);
}

/** Split `units` across raw resources with v1's jittered weights. */
function splitRaw(units: number, rng: Rng): Bag {
  const w = C.RAW_WEIGHTS.map(x => x * (1 - C.RAW_JITTER / 2 + rng() * C.RAW_JITTER));
  const sum = w.reduce((a, b) => a + b, 0);
  const ore = Math.round((w[0]! / sum) * units);
  const coal = Math.round((w[1]! / sum) * units);
  const stone = Math.max(0, units - ore - coal);
  const out: Bag = {};
  if (ore) out.iron_ore = ore;
  if (coal) out.coal = coal;
  if (stone) out.stone = stone;
  return out;
}

const fmtBag = (b: Bag) =>
  (Object.entries(b) as Array<[ResourceId, number]>).filter(([, n]) => n > 0).map(([id, n]) => `+${n} ${RESOURCES[id].name}`).join(', ');

function cardioRun(s: State, minutes: number, im: number, zoneId: string, ctx: Ctx, ev: GameEvent[]): { text: string; failed: boolean } {
  const zone = zoneById(zoneId);
  s.avatar.volume.speed += minutes;
  const speedLvl = effectiveLevel(s, 'speed') - 1; // zones use 0-based speed levels
  const short = zone.requiredSpeed - speedLvl;
  const base = C.LOOT_K * Math.pow(minutes, C.LOOT_DURATION_EXP) * im * statMult(s, 'speed');

  if (short > 0) {
    const chance = Math.max(C.SALVAGE_FLOOR, C.SALVAGE_BASE - C.SALVAGE_DECAY * (short - 1));
    if (ctx.rng() < chance) {
      const units = Math.max(0, Math.round(base * (C.SALVAGE_MULT_BASE / short)));
      const loot = splitRaw(units, ctx.rng);
      addBag(s.res, loot);
      ev.push({ type: 'loot', zone: zoneId, outcome: 'salvage', yield: loot, premium: null, steel: false, pity: false, research: 0, gearDrop: null });
      return { text: `Not ready for ${zone.name} — scraped together ${fmtBag(loot) || 'barely anything'}`, failed: true };
    }
    ev.push({ type: 'loot', zone: zoneId, outcome: 'failed', yield: {}, premium: null, steel: false, pity: false, research: 0, gearDrop: null });
    return { text: `Not ready for ${zone.name} — came back empty-handed`, failed: true };
  }

  const units = Math.max(1, Math.round(base * zone.lootMult * lootBonus(s)));
  const loot = splitRaw(units, ctx.rng);

  let premium: ResourceId | null = null;
  if (ctx.rng() < Math.min(C.PREMIUM_CAP, C.PREMIUM_K * minutes * im * zone.lootMult)) {
    premium = weightedPick(ctx.rng, PREMIUM_WEIGHTS);
    loot[premium] = (loot[premium] ?? 0) + 1;
    s.weekly.premiumFound++;
  }

  const steelRoll = ctx.rng() < Math.min(C.STEEL_DROP_CAP, C.STEEL_DROP_K * minutes * zone.lootMult);
  const pity = !steelRoll && s.runsSinceSteel + 1 >= C.PITY_THRESHOLD;
  const steel = steelRoll || pity;
  if (steel) { loot.hardened_steel = (loot.hardened_steel ?? 0) + 1; s.runsSinceSteel = 0; } else s.runsSinceSteel++;

  let research = 0;
  if (ctx.rng() < Math.min(C.RESEARCH_FIND_CAP, C.RESEARCH_FIND_K * minutes * zone.lootMult)) {
    research = Math.max(1, Math.round((1 + Math.floor(ctx.rng() * 2)) * statMult(s, 'research')));
    s.research += research;
    s.avatar.volume.research += research;
  }

  let gearDrop: StatId | null = null;
  if (GEAR_DROP_ZONES.has(zone.id)) {
    const open = STAT_IDS.filter(st => s.avatar.gear[st] < C.MAX_GEAR_TIER);
    if (open.length && ctx.rng() < Math.min(C.GEAR_DROP_CAP, C.GEAR_DROP_K * minutes * zone.lootMult)) {
      gearDrop = pick(ctx.rng, open);
      s.avatar.gear[gearDrop]++;
      ev.push({ type: 'gear', stat: gearDrop, tier: s.avatar.gear[gearDrop] });
    }
  }

  addBag(s.res, loot);
  ev.push({ type: 'loot', zone: zoneId, outcome: 'success', yield: loot, premium, steel, pity, research, gearDrop });

  s.lootRunsCompleted++;
  s.weekly.ventures.push(zone.tier);
  s.maxZoneTierReached = Math.max(s.maxZoneTierReached, zone.tier);

  const parts = [fmtBag(loot)];
  if (research) parts.push(`+${research} Research`);
  if (gearDrop) parts.push(`${GEAR[gearDrop].name} tier ${s.avatar.gear[gearDrop]} found!`);
  let text = `${zone.name}: ${parts.filter(Boolean).join(', ')}`;

  if (shouldRaid(s, ctx.rng)) {
    s.pendingRaid = createRaid(s, Math.floor(ctx.rng() * 2 ** 31), ctx.now, zone.tier);
    ev.push({ type: 'raid_teaser' });
    ev.push({ type: 'raid_pending' });
    text += ' — raiders followed your tracks. They are at the gate.';
  }
  return { text, failed: false };
}

// ---------------------------------------------------------------- Building
function takeSlot(s: State, wanted: number | undefined, wall: boolean): number {
  if (wanted !== undefined) {
    if (wanted < 0 || wanted >= s.slots.length) throw new GameError('No such slot.');
    if (s.slots[wanted]) throw new GameError('That slot is taken.');
    if (wall && !slotIsWall(s, wanted)) throw new GameError('Turrets go on the wall.');
    return wanted;
  }
  const free = wall ? freeSlots(s, true) : [...freeSlots(s, false), ...freeSlots(s, true)];
  if (free.length === 0) throw new GameError(wall ? 'No free wall slot.' : 'The factory is full — upgrade its size.');
  return free[0]!;
}

function build(s: State, id: keyof typeof BUILDINGS, slot: number | undefined, ev: GameEvent[]): void {
  const def = BUILDINGS[id];
  const blocker = buildingBlocker(s, def);
  if (blocker) throw new GameError(blocker);
  const idx = takeSlot(s, slot, false);
  payCost(s, def.cost);
  const iid = newId(s, 'b');
  s.buildings[iid] = { iid, def: id, upgrade: null };
  s.slots[idx] = { kind: 'building', iid };
  ev.push({ type: 'built', building: id, iid, slot: idx });
}

function upgradeBuilding(s: State, iid: string, upgradeId: string, ev: GameEvent[]): void {
  const b = s.buildings[iid];
  if (!b) throw new GameError('That building is gone.');
  if (b.upgrade) throw new GameError('This building already took its path.');
  const u = BUILDINGS[b.def].upgrades.find(u => u.id === upgradeId);
  if (!u) throw new GameError('No such upgrade.');
  payCost(s, u.cost);
  b.upgrade = u.id;
  ev.push({ type: 'upgraded', building: b.def, upgrade: u.id });
}

function demolish(s: State, kind: 'building' | 'turret', iid: string, ev: GameEvent[]): void {
  if (s.labor < C.DEMOLISH_LABOR) throw new GameError(`Needs ${C.DEMOLISH_LABOR} Labor.`);
  let name: string, value: number;
  if (kind === 'building') {
    const b = s.buildings[iid];
    if (!b) throw new GameError('That building is gone.');
    const def = BUILDINGS[b.def];
    const u = b.upgrade ? def.upgrades.find(u => u.id === b.upgrade) : null;
    name = u ? u.name : def.name;
    value = costValue(def.cost) + (u ? costValue(u.cost) : 0);
  } else {
    const t = s.turrets[iid];
    if (!t) throw new GameError('That turret is gone.');
    name = TURRETS[t.def].name;
    value = costValue(TURRETS[t.def].cost);
  }
  s.labor -= C.DEMOLISH_LABOR;
  s.avatar.volume.strength += C.DEMOLISH_LABOR;
  const refund = Math.floor(value * C.DEMOLISH_REFUND);
  s.gold += refund;
  removeNode(s, kind, iid);
  ev.push({ type: 'demolished', kind, name, refund });
}

function buildTurret(s: State, id: keyof typeof TURRETS, slot: number | undefined, ev: GameEvent[]): void {
  const def = TURRETS[id];
  const idx = takeSlot(s, slot, true);
  payCost(s, def.cost);
  const iid = newId(s, 't');
  s.turrets[iid] = { iid, def: id, ammo: 0 };
  s.slots[idx] = { kind: 'turret', iid };
  ev.push({ type: 'turret_built', turret: id, iid, slot: idx });
}

function loadAmmo(s: State, iid: string, ev: GameEvent[], fill: boolean): void {
  const t = s.turrets[iid];
  if (!t) throw new GameError('That turret is gone.');
  const res = TURRETS[t.def].ammo;
  const room = C.AMMO_CAP - t.ammo;
  if (room <= 0) throw new GameError('Ammo is full.');
  const n = Math.min(fill ? room : C.AMMO_LOAD_AMOUNT, room, s.res[res]);
  if (n <= 0) throw new GameError(`No ${RESOURCES[res].name} to load.`);
  s.res[res] -= n;
  t.ammo += n;
  ev.push({ type: 'ammo', iid, added: n });
}

function move(s: State, from: number, to: number, ev: GameEvent[]): void {
  if (from === to) return;
  if ([from, to].some(i => i < 0 || i >= s.slots.length)) throw new GameError('No such slot.');
  const a = s.slots[from] ?? null, b = s.slots[to] ?? null;
  if (!a && !b) return;
  for (const [entry, dest] of [[a, to], [b, from]] as Array<[typeof a, number]>) {
    if (entry?.kind === 'turret' && !slotIsWall(s, dest)) throw new GameError('Turrets stay on the wall.');
  }
  s.slots[from] = b;
  s.slots[to] = a;
  // Moving anything drops belts feeding it — deliberate v1 rule, kept for consistency.
  let removed = 0;
  for (const e of [a, b]) if (e) removed += removeConveyorsTouching(s, e.kind, e.iid);
  ev.push({ type: 'moved', from, to, beltsRemoved: removed });
}

function addConveyor(s: State, a: Extract<Action, { type: 'add_conveyor' }>, ev: GameEvent[]): void {
  if (!s.techs.includes('conveyor_systems')) throw new GameError('Research Conveyor Systems first.');
  validateConveyor(s, a.from, a.to, a.resource);
  const id = newId(s, 'c');
  s.conveyors.push({ id, resource: a.resource, tier: 1, from: a.from, to: a.to });
  ev.push({ type: 'conveyor', op: 'added', id });
}

// ---------------------------------------------------------------- Market
function sell(s: State, resource: ResourceId, units: number, ev: GameEvent[]): void {
  const def = RESOURCES[resource];
  if (!Number.isInteger(units) || units <= 0) throw new GameError('Choose how many to sell.');
  if (s.res[resource] < units) throw new GameError(`You only have ${s.res[resource]} ${def.name}.`);
  const laborCost = sellLaborCost(s) * units;
  if (s.labor < laborCost) throw new GameError(`Selling ${units} needs ${laborCost} Labor.`);
  s.res[resource] -= units;
  s.labor -= laborCost;
  s.avatar.volume.strength += laborCost;
  const gold = Math.round(units * def.sell * sellBonus(s));
  s.gold += gold;
  s.weekly.sold[resource] = (s.weekly.sold[resource] ?? 0) + units;
  ev.push({ type: 'sold', resource, units, gold });
}

function buy(s: State, resource: ResourceId, units: number, ev: GameEvent[]): void {
  const def = RESOURCES[resource];
  if (!def.buyable) throw new GameError(`${def.name} can only be found or made.`);
  if (!Number.isInteger(units) || units <= 0) throw new GameError('Choose how many to buy.');
  const gold = units * def.sell * C.BUY_PRICE_MULT;
  if (s.gold < gold) throw new GameError(`Needs ${gold} Gold.`);
  s.gold -= gold;
  s.res[resource] += units;
  ev.push({ type: 'bought', resource, units, gold });
}

function emergencyEnergy(s: State, ev: GameEvent[]): void {
  const cost = C.EMERGENCY_ENERGY_BASE_COST + C.EMERGENCY_ENERGY_STEP * s.emergencyUsesThisWeek;
  if (s.gold < cost) throw new GameError(`Needs ${cost} Gold.`);
  s.gold -= cost;
  s.energy += C.EMERGENCY_ENERGY_AMOUNT;
  s.emergencyUsesThisWeek++;
  ev.push({ type: 'emergency_energy', cost, amount: C.EMERGENCY_ENERGY_AMOUNT });
}

// ---------------------------------------------------------------- Progression
function research(s: State, tech: keyof typeof TECHS, ctx: Ctx, ev: GameEvent[]): void {
  const def = TECHS[tech];
  if (s.techs.includes(tech)) throw new GameError('Already researched.');
  if (!techAvailable(s, tech)) throw new GameError(`Needs ${def.requires.map(r => TECHS[r].name).join(' and ')} first.`);
  if (s.research < def.cost) throw new GameError(`Needs ${def.cost} Research.`);
  s.research -= def.cost;
  s.techs.push(tech);
  ev.push({ type: 'tech', tech });
  if (tech === 'endurance_training') topUpContracts(s, ctx.rng);
}

function buildInfra(s: State, id: keyof typeof INFRA, ev: GameEvent[]): void {
  if (s.infra.includes(id)) throw new GameError('Already built.');
  payCost(s, INFRA[id].cost);
  s.infra.push(id);
  ev.push({ type: 'infra', infra: id });
}

function buildSolar(s: State, ev: GameEvent[]): void {
  if (!s.infra.includes('reinforced_roof')) throw new GameError('Needs the Reinforced Roof first.');
  if (s.solar >= solarCap(s)) throw new GameError(`The roof holds ${solarCap(s)} panel${solarCap(s) > 1 ? 's' : ''} at this factory size.`);
  payCost(s, SOLAR_PANEL.cost);
  s.solar++;
  ev.push({ type: 'solar', count: s.solar });
}

function upgradeWall(s: State, ev: GameEvent[]): void {
  if (s.wall >= 3) throw new GameError('The wall is as strong as it gets.');
  if (s.pendingRaid && !s.pendingRaid.fight.done) throw new GameError('Not with raiders at the gate.');
  const next = wallDef(s.wall + 1);
  payCost(s, { res: next.cost, gold: next.gold, labor: 0, research: 0 });
  s.wall = next.tier;
  // The road changes shape: anything now standing on it steps off, barricades are cleared.
  for (const [iid, cell] of Object.entries(s.turretCells)) if (!placeable({ ...s, turretCells: {} }, cell)) delete s.turretCells[iid];
  s.barricades = [];
  ev.push({ type: 'wall', tier: s.wall });
}

function upgradeFactory(s: State, ev: GameEvent[]): void {
  const next = nextFactorySize(s);
  if (!next) throw new GameError('The factory is as big as it gets.');
  payCost(s, { res: next.cost, gold: next.gold, labor: 0, research: 0 });
  const cur = FACTORY_SIZES[s.factorySize - 1]!;
  // Interior grows: insert new empty interior slots before the wall row so wall entries keep their meaning.
  const interior = s.slots.slice(0, cur.interior);
  const wall = s.slots.slice(cur.interior);
  s.slots = [
    ...interior, ...Array.from({ length: next.interior - cur.interior }, () => null),
    ...wall, ...Array.from({ length: next.wall - cur.wall }, () => null),
  ];
  s.factorySize = next.level;
  ev.push({ type: 'factory_size', level: next.level });
}

function buyContractSlot(s: State, ctx: Ctx, ev: GameEvent[]): void {
  const price = nextContractSlotPrice(s);
  if (price === null) throw new GameError('No more contracts on offer this week.');
  if (s.gold < price) throw new GameError(`Needs ${price} Gold.`);
  const before = s.contracts.slots.length;
  s.contracts.bought = (s.contracts.bought ?? 0) + 1;
  topUpContracts(s, ctx.rng);
  if (s.contracts.slots.length === before) { s.contracts.bought--; throw new GameError('Nothing left in the pool you qualify for.'); }
  s.gold -= price;
  ev.push({ type: 'contract_slot', cost: price });
}

function claimContract(s: State, id: string, ev: GameEvent[]): void {
  const slot = s.contracts.slots.find(c => c.id === id);
  if (!slot) throw new GameError('That contract is not on offer this week.');
  if (slot.done) throw new GameError('Already delivered.');
  const p = contractProgress(s, id);
  if (!p.ready) throw new GameError(`Not there yet: ${p.current} of ${p.target}.`);
  const def = contractById(id);
  try { payContract(s, def.goal); } catch { throw new GameError('Not enough to deliver.'); }
  s.gold += def.reward;
  slot.done = true;
  s.contracts.completedTotal++;
  ev.push({ type: 'contract_done', id, reward: def.reward });
}
