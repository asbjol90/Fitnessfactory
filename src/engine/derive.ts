import { C } from './constants';
import { FACTORY_SIZES, GEAR, STAT_IDS, STAT_THRESHOLDS, TECHS, type StatId, type TechId } from './data/core';
import { BUILDINGS, TECH_EFFECT, TURRETS, WORKSHOP_UNLOCK, type BuildingDef, type BuildingId, type Gate, type Recipe } from './data/factory';
import type { BuildingInst, State } from './state';

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
export const contractSlotCount = (s: State) =>
  hasTech(s, 'endurance_training') ? C.CONTRACT_SLOTS_WITH_ENDURANCE : C.CONTRACT_SLOTS_BASE;

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
  if (hasBuilding(s, def.id)) return 'Already built';
  if (def.floor === 'workshop' && !workshopUnlocked(s)) return 'Workshop floor locked';
  const g = def.gate;
  if (!gateOpen(s, g)) {
    if (g.kind === 'infra') return `Needs ${g.infra.map(i => i.replace('_', ' ')).join(' + ')}`;
    if (g.kind === 'upgrade') return `Needs ${BUILDINGS[g.building].upgrades.find(u => u.id === g.upgrade)?.name ?? g.upgrade}`;
  }
  return null;
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
  let drain = C.BASE_DAILY_DRAIN, solar = 0;
  for (const b of Object.values(s.buildings)) {
    drain += activeDrain(b);
    solar += BUILDINGS[b.def].passiveEnergy ?? 0;
  }
  return { drain, solar, net: solar - drain };
}

export const freeSlots = (s: State, wall: boolean) =>
  s.slots.map((e, i) => (e === null && slotIsWall(s, i) === wall ? i : -1)).filter(i => i >= 0);

export const turretOutput = (def: keyof typeof TURRETS) => TURRETS[def].shots * TURRETS[def].damage;

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
