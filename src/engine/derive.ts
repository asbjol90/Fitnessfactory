import { C } from './constants';
import { FACTORY_SIZES, GEAR, STAT_IDS, STAT_THRESHOLDS, TECHS, type StatId, type TechId } from './data/core';
import { BUILDINGS, TECH_EFFECT, TURRETS, WORKSHOP_UNLOCK, type BuildingDef, type BuildingId, type Gate, type Recipe } from './data/factory';
import { timesAffordable, type BuildingInst, type State } from './state';

// ---------------------------------------------------------------- Avatar
/** Natural level 1..5 from cumulative volume. */
export function naturalLevel(stat: StatId, volume: number): number {
  const th = STAT_THRESHOLDS[stat];
  let lvl = 0;
  for (const t of th) if (volume >= t) lvl++;
  return Math.max(1, Math.min(C.MAX_STAT_LEVEL, lvl));
}
export function effectiveLevel(s: State, stat: StatId): number {
  return Math.min(C.MAX_STAT_LEVEL, naturalLevel(stat, s.avatar.volume[stat]) + s.avatar.gear[stat]);
}
export function statMult(s: State, stat: StatId): number {
  return C.STAT_LEVEL_MULT[effectiveLevel(s, stat) - 1] ?? 1;
}
/** Progress toward next natural level, 0..1 (1 at max). */
export function levelProgress(stat: StatId, volume: number): { level: number; next: number | null; frac: number } {
  const th = STAT_THRESHOLDS[stat];
  const level = naturalLevel(stat, volume);
  const next = th[level] ?? null;
  const prev = th[level - 1] ?? 0;
  const frac = next === null ? 1 : Math.min(1, (volume - prev) / (next - prev));
  return { level, next, frac };
}
/** Overall visual gear stage 0..4 (rounded mean of tiers) — used only by art. */
export function gearStage(s: State): number {
  const sum = STAT_IDS.reduce((a, st) => a + s.avatar.gear[st], 0);
  return Math.round(sum / STAT_IDS.length);
}
export function gearUpgradeCost(s: State, stat: StatId): { material: typeof GEAR[StatId]['material']; amount: number } | null {
  const tier = s.avatar.gear[stat];
  if (tier >= C.MAX_GEAR_TIER) return null;
  return { material: GEAR[stat].material, amount: GEAR[stat].tierCosts[tier]! };
}

// ---------------------------------------------------------------- Techs
export const hasTech = (s: State, t: TechId) => s.techs.includes(t);
const bonus = (s: State, key: keyof typeof TECH_EFFECT) =>
  1 + TECH_EFFECT[key].reduce((acc, [t, b]) => acc + (hasTech(s, t) ? b : 0), 0);
export const lootBonus = (s: State) => bonus(s, 'lootBonus');
export const laborBonus = (s: State) => bonus(s, 'laborBonus');
export const energyBonus = (s: State) => bonus(s, 'energyBonus');
export const sellBonus = (s: State) => bonus(s, 'sellBonus');
export const sellLaborCost = (s: State) => (hasTech(s, 'basic_logistics') ? 0 : C.SELL_LABOR_COST);
export function techAvailable(s: State, t: TechId): boolean {
  const d = TECHS[t];
  return !hasTech(s, t) && d.requires.every(r => hasTech(s, r));
}
export const freeContractSlots = (s: State) =>
  hasTech(s, 'endurance_training') ? C.CONTRACT_SLOTS_WITH_ENDURANCE : C.CONTRACT_SLOTS_BASE;
export const contractSlotCount = (s: State) => freeContractSlots(s) + (s.contracts.bought ?? 0);
/** Price of the next extra slot this week, or null when sold out. */
export const nextContractSlotPrice = (s: State): number | null => C.CONTRACT_SLOT_PRICES[s.contracts.bought ?? 0] ?? null;

// ---------------------------------------------------------------- Factory
export const factorySize = (s: State) => FACTORY_SIZES[s.factorySize - 1]!;
export const slotIsWall = (s: State, idx: number) => idx >= factorySize(s).interior;
export const nextFactorySize = (s: State) => FACTORY_SIZES[s.factorySize] ?? null;

export const buildingsByDef = (s: State): Partial<Record<BuildingId, BuildingInst>> => {
  const out: Partial<Record<BuildingId, BuildingInst>> = {};
  for (const b of Object.values(s.buildings)) out[b.def] = b;
  return out;
};
export const hasBuilding = (s: State, id: BuildingId) => Object.values(s.buildings).some(b => b.def === id);
export const findBuilding = (s: State, id: BuildingId) => Object.values(s.buildings).find(b => b.def === id) ?? null;
export const hasUpgrade = (s: State, id: BuildingId, upg: string) => findBuilding(s, id)?.upgrade === upg;

export const workshopUnlocked = (s: State) =>
  Object.values(s.buildings).filter(b => BUILDINGS[b.def].floor === 'main').length >= WORKSHOP_UNLOCK.mainBuildings
  || s.contracts.completedTotal >= WORKSHOP_UNLOCK.contracts;

export function gateOpen(s: State, g: Gate): boolean {
  switch (g.kind) {
    case 'none': return true;
    case 'infra': return g.infra.every(i => s.infra.includes(i));
    case 'upgrade': return hasUpgrade(s, g.building, g.upgrade);
  }
}
/** Why a building can't be built right now, or null if it can be (ignoring cost). */
export function buildingBlocker(s: State, def: BuildingDef): string | null {
  if (def.floor === 'workshop' && !workshopUnlocked(s)) return 'Workshop floor locked';
  const g = def.gate;
  if (!gateOpen(s, g)) {
    if (g.kind === 'infra') return `Needs ${g.infra.map(i => i.replace('_', ' ')).join(' + ')}`;
    if (g.kind === 'upgrade') return `Needs ${BUILDINGS[g.building].upgrades.find(u => u.id === g.upgrade)?.name ?? g.upgrade}`;
  }
  return null;
}

/** "Furnace", or "Furnace 2" when there are several of the same kind. */
export function buildingLabel(s: State, iid: string): string {
  const b = s.buildings[iid];
  if (!b) return '?';
  const def = BUILDINGS[b.def];
  const u = b.upgrade ? def.upgrades.find(u => u.id === b.upgrade) : null;
  const siblings = Object.values(s.buildings).filter(x => x.def === b.def).map(x => x.iid);
  const n = siblings.length > 1 ? ` ${siblings.indexOf(iid) + 1}` : '';
  return `${u ? u.name : def.name}${n}`;
}
/** Recipes active for an instance (upgrade overrides base). */
export function activeRecipes(b: BuildingInst): Recipe[] {
  const def = BUILDINGS[b.def];
  if (b.upgrade) {
    const u = def.upgrades.find(u => u.id === b.upgrade);
    if (u) return u.recipes;
  }
  return def.recipes;
}
export function activeDrain(b: BuildingInst): number {
  const def = BUILDINGS[b.def];
  const u = b.upgrade ? def.upgrades.find(u => u.id === b.upgrade) : null;
  return u ? u.drain : def.drain;
}
export function dailyEnergyBalance(s: State): { drain: number; solar: number; net: number } {
  let drain = C.BASE_DAILY_DRAIN;
  for (const b of Object.values(s.buildings)) drain += activeDrain(b);
  const solar = s.solar * C.SOLAR_ENERGY_PER_DAY;
  return { drain, solar, net: solar - drain };
}
export const solarCap = (s: State) => C.SOLAR_CAP[s.factorySize - 1] ?? 1;

export const freeSlots = (s: State, wall: boolean) =>
  s.slots.map((e, i) => (e === null && slotIsWall(s, i) === wall ? i : -1)).filter(i => i >= 0);

import { TURRET_COMBAT } from './data/defence';
/** Damage per tick while a target is in range and ammo lasts. */
export const turretOutput = (def: keyof typeof TURRETS) => TURRET_COMBAT[def].damage * TURRET_COMBAT[def].rate;

// ---------------------------------------------------------------- Session preview
import type { Intensity, SessionKind } from './state';
import { zoneById } from './data/core';
export interface SessionPreview {
  counted: number; capped: boolean;
  labor?: number; energy?: number;
  lootUnits?: number; premiumChance?: number; steelChance?: number; short?: number; salvageChance?: number;
}
/** Deterministic expectation for the Train screen (no RNG). Mirrors game.ts formulas. */
export function previewSession(s: State, kind: SessionKind, minutes: number, intensity: Intensity, zoneId?: string): SessionPreview {
  const counted = Math.min(Math.max(0, Math.round(minutes)), C.MINUTE_CAP[intensity]);
  const im = C.INTENSITY_MULT[intensity];
  const out: SessionPreview = { counted, capped: counted < Math.round(minutes) };
  if (kind === 'strength') out.labor = Math.max(1, Math.round(C.LABOR_K * counted * im * statMult(s, 'strength') * laborBonus(s)));
  if (kind === 'flexibility') out.energy = Math.max(1, Math.round(C.ENERGY_K * counted * im * statMult(s, 'energy') * energyBonus(s)));
  if (kind === 'cardio' && zoneId) {
    const zone = zoneById(zoneId);
    const short = zone.requiredSpeed - (effectiveLevel(s, 'speed') - 1);
    const base = C.LOOT_K * Math.pow(counted, C.LOOT_DURATION_EXP) * im * statMult(s, 'speed');
    if (short > 0) {
      out.short = short;
      out.salvageChance = Math.max(C.SALVAGE_FLOOR, C.SALVAGE_BASE - C.SALVAGE_DECAY * (short - 1));
      out.lootUnits = Math.round(base * (C.SALVAGE_MULT_BASE / short));
    } else {
      out.lootUnits = Math.max(1, Math.round(base * zone.lootMult * lootBonus(s)));
      out.premiumChance = Math.min(C.PREMIUM_CAP, C.PREMIUM_K * counted * im * zone.lootMult);
      out.steelChance = Math.min(C.STEEL_DROP_CAP, C.STEEL_DROP_K * counted * zone.lootMult);
    }
  }
  return out;
}

// ---------------------------------------------------------------- Belts & hauling
import type { Conveyor } from './state';
import type { Bag, ResourceId } from './data/core';
export const beltCapacity = (c: Conveyor) => C.BELT_CAPACITY[c.tier - 1] ?? 3;
export const beltUpgradeCost = (c: Conveyor): { res: Bag; gold: number } | null => (c.tier >= 3 ? null : (C.BELT_UPGRADE_COST as ReadonlyArray<{ res: Bag; gold: number }>)[c.tier] ?? null);
/** Is `resource` delivered INTO building `iid` by a belt? */
export const hasInputBelt = (s: State, iid: string, resource: ResourceId) =>
  s.conveyors.some(c => c.to.kind === 'building' && c.to.iid === iid && c.resource === resource);
/** Is `resource` carried OUT of building `iid` by a belt? */
export const hasOutputBelt = (s: State, iid: string, resource: ResourceId) =>
  s.conveyors.some(c => c.from.kind === 'building' && c.from.iid === iid && c.resource === resource);
/** Hauling Labor for running `recipe` `units` times on `iid`: unbelted inputs and outputs cost 1 Labor per HAUL_UNITS_PER_LABOR units. */
export function haulingLabor(s: State, iid: string, recipe: Recipe, units: number): number {
  let moved = 0;
  for (const [id, n] of Object.entries(recipe.inputs) as Array<[ResourceId, number]>) if (!hasInputBelt(s, iid, id)) moved += n * units;
  for (const [id, n] of Object.entries(recipe.output) as Array<[ResourceId, number]>) if (!hasOutputBelt(s, iid, id)) moved += n * units;
  return Math.ceil(moved / C.HAUL_UNITS_PER_LABOR);
}

// ---------------------------------------------------------------- Machine state (for the floor art)
export type MachineState = 'idle' | 'run' | 'starved';
/**
 * starved: can't run a single unit of any recipe (no Energy, or no recipe has its inputs in stock).
 * run: produced something today (belt tick or by hand).
 * idle: otherwise.
 */
export function machineState(s: State, iid: string): MachineState {
  const b = s.buildings[iid];
  if (!b) return 'idle';
  const recipes = activeRecipes(b);
  if (recipes.length > 0) {
    const canRun = recipes.some(r => timesAffordable(s.res, r.inputs) >= 1 && s.energy >= r.energy);
    if (!canRun) return 'starved';
  }
  if (s.lastRunDay[iid] === s.lastDayKey) return 'run';
  return 'idle';
}
