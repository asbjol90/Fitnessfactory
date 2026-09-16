import type { AvatarId, Bag, HabitId, ResourceId, StatId, TechId } from './data/core';
import { HABIT_IDS, RESOURCE_IDS, STAT_IDS } from './data/core';
import { C } from './constants';
import type { BuildingId, InfraId, TurretId } from './data/factory';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'fitnessfactory_state_v2';
export const V1_SAVE_KEY = 'fitnessfactory_state_v1';

export type Rng = () => number;

// ---------------------------------------------------------------- Nodes
export type NodeRef =
  | { kind: 'stock' }
  | { kind: 'trader' }
  | { kind: 'building'; iid: string }
  | { kind: 'turret'; iid: string };

export interface BuildingInst { iid: string; def: BuildingId; upgrade: string | null; }
export interface TurretInst { iid: string; def: TurretId; ammo: number; }
export type SlotEntry = { kind: 'building'; iid: string } | { kind: 'turret'; iid: string };

export interface Conveyor { id: string; resource: ResourceId; amount: number; from: NodeRef; to: NodeRef; }

// ---------------------------------------------------------------- Training log
export type SessionKind = 'cardio' | 'strength' | 'flexibility';
export type Intensity = 'light' | 'medium' | 'hard';
export interface Session {
  at: number; kind: SessionKind; minutes: number; intensity: Intensity;
  zone?: string; note?: string;
  /** One-line result for the history screen ("+12 Labor", "Quarry: 9 ore, 1 silver"). */
  result: string;
  failed?: boolean;
}

// ---------------------------------------------------------------- Raids
export interface RaidRecord {
  at: number;
  runIndex: number;              // state.lootRunsCompleted when it fired
  zoneTier: number;
  raiders: number; hpEach: number; totalHp: number;
  damageDealt: number;
  ticksUsed: number;
  repelled: boolean;
  shots: Array<{ turretIid: string; def: TurretId; shots: number; damage: number }>;
  loss: null
    | { kind: 'steal'; resource: ResourceId; amount: number }
    | { kind: 'turret'; def: TurretId }
    | { kind: 'building'; def: BuildingId };
}

// ---------------------------------------------------------------- Contracts
export interface ContractSlot { id: string; done: boolean; }
export interface WeeklyCounters {
  laborEarned: number;
  energyEarned: number;
  produced: Bag;
  sold: Bag;
  premiumFound: number;
  ventures: number[];            // zone tiers of successful runs this week
  spendIn: Record<string, { labor: number; energy: number }>; // by building def id
}

// ---------------------------------------------------------------- State
export interface State {
  version: typeof SAVE_VERSION;
  createdAt: number;
  lastDayKey: string;
  weekKey: string;

  avatar: {
    id: AvatarId | null;
    name: string;
    volume: Record<StatId, number>;   // cumulative driver per stat
    gear: Record<StatId, number>;     // tier 0..4
  };

  res: Record<ResourceId, number>;
  gold: number;
  labor: number;
  energy: number;
  research: number;

  techs: TechId[];
  infra: InfraId[];
  factorySize: number;

  slots: Array<SlotEntry | null>;
  buildings: Record<string, BuildingInst>;
  turrets: Record<string, TurretInst>;
  conveyors: Conveyor[];
  nextId: number;

  lootRunsCompleted: number;
  runsSinceSteel: number;
  maxZoneTierReached: number;
  raidHistory: RaidRecord[];

  contracts: { slots: ContractSlot[]; completedTotal: number };
  weekly: WeeklyCounters;
  emergencyUsesThisWeek: number;

  nutrition: { dayKey: string; counts: Record<HabitId, number> };
  sessions: Session[];
  /** Sessions trimmed off the end are counted here so lifetime totals survive. */
  archived: { sessions: number; minutes: number };
}

export const emptyHabitCounts = (): Record<HabitId, number> =>
  Object.fromEntries(HABIT_IDS.map(h => [h, 0])) as Record<HabitId, number>;

export const emptyBag = (): Record<ResourceId, number> =>
  Object.fromEntries(RESOURCE_IDS.map(id => [id, 0])) as Record<ResourceId, number>;

export const emptyWeekly = (): WeeklyCounters =>
  ({ laborEarned: 0, energyEarned: 0, produced: {}, sold: {}, premiumFound: 0, ventures: [], spendIn: {} });

export function initialState(now: number): State {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastDayKey: dayKey(now),
    weekKey: weekKey(now),
    avatar: {
      id: null, name: '',
      volume: Object.fromEntries(STAT_IDS.map(s => [s, 0])) as Record<StatId, number>,
      gear: Object.fromEntries(STAT_IDS.map(s => [s, 0])) as Record<StatId, number>,
    },
    res: emptyBag(),
    gold: 0, labor: 0, energy: C.START_ENERGY, research: 0,
    techs: [], infra: [], factorySize: 1,
    slots: Array.from({ length: 6 }, () => null),
    buildings: {}, turrets: {}, conveyors: [], nextId: 1,
    lootRunsCompleted: 0, runsSinceSteel: 0, maxZoneTierReached: 0, raidHistory: [],
    contracts: { slots: [], completedTotal: 0 },
    weekly: emptyWeekly(),
    emergencyUsesThisWeek: 0,
    nutrition: { dayKey: dayKey(now), counts: emptyHabitCounts() },
    sessions: [],
    archived: { sessions: 0, minutes: 0 },
  };
}

// ---------------------------------------------------------------- Dates
const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar day, YYYY-MM-DD. */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Monday-based week key: the dayKey of that week's Monday. */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return dayKey(d.getTime());
}
export function daysBetween(fromKey: string, toKey: string): number {
  const a = new Date(fromKey + 'T00:00:00'), b = new Date(toKey + 'T00:00:00');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

// ---------------------------------------------------------------- Bags
export const bagEntries = (b: Bag) => Object.entries(b) as Array<[ResourceId, number]>;
export const hasBag = (res: Record<ResourceId, number>, cost: Bag, times = 1) =>
  bagEntries(cost).every(([id, n]) => res[id] >= n * times);
export function subBag(res: Record<ResourceId, number>, cost: Bag, times = 1): void {
  for (const [id, n] of bagEntries(cost)) res[id] -= n * times;
}
export function addBag(res: Record<ResourceId, number>, add: Bag, times = 1): void {
  for (const [id, n] of bagEntries(add)) res[id] += n * times;
}
export function addToBag(target: Bag, id: ResourceId, n: number): void {
  target[id] = (target[id] ?? 0) + n;
}
/** Max times a cost bag fits inside stock. Infinity for empty cost. */
export function timesAffordable(res: Record<ResourceId, number>, cost: Bag): number {
  let t = Infinity;
  for (const [id, n] of bagEntries(cost)) if (n > 0) t = Math.min(t, Math.floor(res[id] / n));
  return t;
}

// ---------------------------------------------------------------- RNG
/** Deterministic mulberry32 — used in tests and for replayable raids. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T>(rng: Rng, arr: readonly T[]): T => {
  if (arr.length === 0) throw new Error('pick from empty');
  return arr[Math.floor(rng() * arr.length)] as T;
};
export function weightedPick<T>(rng: Rng, items: ReadonlyArray<readonly [T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rng() * total;
  for (const [item, w] of items) { x -= w; if (x <= 0) return item; }
  return items[items.length - 1]![0];
}

/** Structured clone that also works in old test envs. */
export const clone = <T>(v: T): T =>
  typeof structuredClone === 'function' ? structuredClone(v) : (JSON.parse(JSON.stringify(v)) as T);
