import { STAT_IDS, type StatId, type ResourceId, type TechId } from './data/core';
import { BUILDINGS, TURRETS, type BuildingId, type InfraId, type TurretId } from './data/factory';
import { RESOURCE_IDS } from './data/core';
import { emptyHabitCounts, initialState, SAVE_KEY, SAVE_VERSION, V1_SAVE_KEY, type SlotEntry, type State } from './state';

/* v1 shape, as read from the shipped index.html. Everything optional: old saves vary. */
interface V1 {
  resources?: Record<string, number>;
  gold?: number; labor?: number; energy?: number;
  buildings?: Record<string, { built?: boolean; upgrade?: string | null }>;
  avatar?: { speedMinutesCum?: number; strengthLaborSpentCum?: number; energyMinutesCum?: number; researchEarnedCum?: number };
  history?: Array<{ date: string; category: string; durationMin: number; intensity?: string; zoneName?: string; resultText?: string; failed?: boolean }>;
  archivedSummary?: { sessions?: number };
  contractsCompletedLifetime?: number;
  emergencyQuotaBuysThisWeek?: number;
  nutritionDate?: string | null;
  nutritionCounts?: Record<string, number>;
  infrastructure?: { roof?: boolean; grid?: boolean; license?: boolean };
  factorySizeLevel?: number;
  gearTiers?: { loot?: number; labor?: number; energy?: number; research?: number };
  avatarStyle?: string;
  hardenedSteelDryStreak?: number;
  avatarChosen?: boolean;
  lootRunsCompleted?: number;
  maxZoneTierReached?: number;
  turretAmmo?: Record<string, number>;
  raidHistory?: unknown[];
  factorySlots?: Array<string | null>;
  techUnlocked?: Record<string, boolean>;
  conveyors?: Array<{ resource: string; to: string; amount: number }>;
}

const V1_INFRA: Record<string, InfraId> = { roof: 'reinforced_roof', grid: 'electrical_grid', license: 'business_license' };
const V1_GEAR: Record<string, StatId> = { loot: 'speed', labor: 'strength', energy: 'energy', research: 'research' };
const V1_UPGRADE: Record<string, string> = {
  blast_furnace: 'blast', forge_works: 'forge', hydraulic: 'hydraulic', sifting: 'sifting',
  industrial_coker: 'industrial', byproduct_coker: 'byproduct', industrial: 'industrial', byproduct: 'byproduct',
  blast: 'blast', forge: 'forge',
};
/** v1 interior grid was fixed at 12 interior + 5 wall slots regardless of size level. */
const V1_MAX_INTERIOR = 12;

export function migrateV1(raw: unknown, now: number): State {
  const v = (raw ?? {}) as V1;
  const s = initialState(now);
  s.createdAt = now;

  for (const id of RESOURCE_IDS) s.res[id] = num(v.resources?.[id]);
  s.research = num(v.resources?.['research']);
  s.gold = num(v.gold); s.labor = num(v.labor); s.energy = num(v.energy, s.energy);

  s.avatar.volume.speed = num(v.avatar?.speedMinutesCum);
  s.avatar.volume.strength = num(v.avatar?.strengthLaborSpentCum);
  s.avatar.volume.energy = num(v.avatar?.energyMinutesCum);
  s.avatar.volume.research = num(v.avatar?.researchEarnedCum);
  for (const [k, st] of Object.entries(V1_GEAR)) s.avatar.gear[st] = clamp(num(v.gearTiers?.[k as keyof V1['gearTiers']]), 0, 4);
  if (v.avatarChosen) s.avatar.id = v.avatarStyle === 'female' ? 'f1_worker' : 'm1_worker';

  s.techs = Object.entries(v.techUnlocked ?? {}).filter(([, on]) => on).map(([id]) => id as TechId);
  s.infra = Object.entries(v.infrastructure ?? {}).filter(([, on]) => on).map(([k]) => V1_INFRA[k]!).filter(Boolean);
  s.factorySize = clamp(num(v.factorySizeLevel, 1), 1, 4);

  // Slots: v1 stored building ids or 'turret:<def>' per slot; ammo keyed by slot index.
  const { interior, wall } = sizeOf(s.factorySize);
  s.slots = Array.from({ length: interior + wall }, () => null);
  const placed = new Set<string>();
  const v1slots = v.factorySlots ?? [];
  v1slots.forEach((val, idx) => {
    if (!val) return;
    const isWall = idx >= V1_MAX_INTERIOR;
    const target = isWall ? interior + (idx - V1_MAX_INTERIOR) : idx;
    if (target >= s.slots.length || s.slots[target]) return; // overflow: re-placed below
    const entry = makeEntry(s, val, num(v.turretAmmo?.[String(idx)]));
    if (entry) { s.slots[target] = entry; placed.add(val); }
  });
  // Buildings marked built but not in a slot (or overflowed) get the first free slot.
  for (const [id, b] of Object.entries(v.buildings ?? {})) {
    if (!b?.built || placed.has(id)) continue;
    if (id === 'solar_panel') { s.solar++; continue; }
    if (!(id in BUILDINGS)) continue;
    const free = s.slots.findIndex(e => e === null);
    if (free < 0) break;
    s.slots[free] = makeEntry(s, id, 0)!;
    placed.add(id);
  }
  // Upgrades.
  for (const inst of Object.values(s.buildings)) {
    const u = v.buildings?.[inst.def]?.upgrade;
    if (u && V1_UPGRADE[u] && BUILDINGS[inst.def].upgrades.some(x => x.id === V1_UPGRADE[u])) inst.upgrade = V1_UPGRADE[u]!;
  }

  // Conveyors: v1 belts had a target only. Source becomes the stockpile.
  for (const c of v.conveyors ?? []) {
    if (!RESOURCE_IDS.includes(c.resource as ResourceId)) continue;
    const to = resolveTarget(s, c.to, v1slots);
    if (!to) continue;
    s.conveyors.push({ id: `c${s.nextId++}`, resource: c.resource as ResourceId, amount: Math.max(1, num(c.amount, 5)), from: { kind: 'stock' }, to });
  }

  s.lootRunsCompleted = num(v.lootRunsCompleted);
  s.runsSinceSteel = num(v.hardenedSteelDryStreak);
  s.maxZoneTierReached = num(v.maxZoneTierReached) + 1 || 0; // v1 was a 0-based index
  if (!v.lootRunsCompleted) s.maxZoneTierReached = 0;
  s.contracts.completedTotal = num(v.contractsCompletedLifetime);
  s.emergencyUsesThisWeek = num(v.emergencyQuotaBuysThisWeek);
  s.nutrition = { dayKey: v.nutritionDate ?? s.nutrition.dayKey, counts: { ...emptyHabitCounts(), ...(v.nutritionCounts ?? {}) } };
  s.archived.sessions = num(v.archivedSummary?.sessions);

  for (const h of v.history ?? []) {
    const kind = h.category === 'cardio' || h.category === 'strength' || h.category === 'flexibility' ? h.category : null;
    if (!kind) continue;
    const intensity = h.intensity === 'light' || h.intensity === 'hard' ? h.intensity : 'medium';
    s.sessions.push({
      at: Date.parse(h.date) || now, kind, minutes: num(h.durationMin), intensity,
      result: h.resultText ?? '', ...(h.failed ? { failed: true } : {}),
    });
  }
  s.sessions.sort((a, b) => b.at - a.at);
  // Raid history: v1 records don't map 1:1 to the new recap format; we keep the count only.
  s.raidHistory = [];
  // Contracts re-roll on first tick (slots empty) — v1 progress within the current week is dropped.
  s.contracts.slots = [];
  // Week key intentionally left at "now": weekly counters start fresh.
  void STAT_IDS;
  return s;
}

function makeEntry(s: State, val: string, ammo: number): SlotEntry | null {
  if (val.startsWith('turret:')) {
    const def = val.slice(7) as TurretId;
    if (!(def in TURRETS)) return null;
    const iid = `t${s.nextId++}`;
    s.turrets[iid] = { iid, def, ammo: clamp(ammo, 0, 200) };
    return { kind: 'turret', iid };
  }
  if (val === 'solar_panel') { s.solar++; return null; }
  if (!(val in BUILDINGS)) return null;
  if (Object.values(s.buildings).some(b => b.def === val)) return null;
  const iid = `b${s.nextId++}`;
  s.buildings[iid] = { iid, def: val as BuildingId, upgrade: null };
  return { kind: 'building', iid };
}

function resolveTarget(s: State, to: string, v1slots: Array<string | null>): State['conveyors'][number]['to'] | null {
  if (to === 'trader') return { kind: 'trader' };
  const m = /^turretslot:(\d+)$/.exec(to);
  if (m) {
    const idx = Number(m[1]);
    const val = v1slots[idx];
    if (!val) return null;
    // Find the turret we created for that slot value in order.
    const def = val.slice(7) as TurretId;
    const t = Object.values(s.turrets).find(t => t.def === def && !s.conveyors.some(c => c.to.kind === 'turret' && c.to.iid === t.iid));
    return t ? { kind: 'turret', iid: t.iid } : null;
  }
  const b = Object.values(s.buildings).find(b => b.def === to);
  return b ? { kind: 'building', iid: b.iid } : null;
}

function sizeOf(level: number): { interior: number; wall: number } {
  return [{ interior: 4, wall: 2 }, { interior: 7, wall: 3 }, { interior: 10, wall: 4 }, { interior: 12, wall: 5 }][level - 1]!;
}
const num = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/**
 * Bring a v2+ save up to the current version. Additive: new resources get 0,
 * new fields get defaults, and content that no longer exists is converted.
 */
export function upgradeSave(raw: unknown): State | null {
  const s = raw as State & { version: number };
  if (!s || typeof s !== 'object' || typeof s.version !== 'number' || s.version < 2 || s.version > SAVE_VERSION) return null;
  for (const id of RESOURCE_IDS) if (typeof s.res[id] !== 'number') s.res[id] = 0;
  if (s.version < 3) {
    // Solar panels moved from slots to the roof; old ammo types changed.
    s.solar = 0;
    for (const [iid, b] of Object.entries(s.buildings)) {
      if ((b.def as string) === 'solar_panel') {
        s.solar++;
        delete s.buildings[iid];
        const idx = s.slots.findIndex(e => e && e.kind === 'building' && e.iid === iid);
        if (idx >= 0) s.slots[idx] = null;
        s.conveyors = s.conveyors.filter(c => !(c.to.kind === 'building' && c.to.iid === iid) && !(c.from.kind === 'building' && c.from.iid === iid));
      }
    }
    // Belts feeding turrets whose ammo type changed are now wrong; drop them (ammo already loaded stays).
    s.conveyors = s.conveyors.filter(c => !(c.to.kind === 'turret' && s.turrets[c.to.iid] && TURRETS[s.turrets[c.to.iid]!.def].ammo !== c.resource));
  }
  s.version = SAVE_VERSION;
  return s;
}

/** Load from localStorage: current save first (upgrading if older), else migrate v1, else fresh. */
export function loadState(storage: Pick<Storage, 'getItem' | 'setItem'>, now: number): { state: State; migrated: boolean } {
  const v2 = storage.getItem(SAVE_KEY);
  if (v2) {
    try {
      const up = upgradeSave(JSON.parse(v2));
      if (up) return { state: up, migrated: false };
    } catch { /* fall through */ }
  }
  const v1 = storage.getItem(V1_SAVE_KEY);
  if (v1) {
    try { return { state: migrateV1(JSON.parse(v1), now), migrated: true }; } catch { /* fall through */ }
  }
  return { state: initialState(now), migrated: false };
}
