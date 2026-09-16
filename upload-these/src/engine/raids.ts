import { C } from './constants';
import { RAW_IDS } from './data/core';
import { BUILDINGS, RAID_WAVES, TURRETS } from './data/factory';
import { pick, weightedPick, type RaidRecord, type Rng, type State } from './state';
import { removeConveyorsTouching } from './conveyors';

export function shouldRaid(s: State, rng: Rng): boolean {
  if (s.lootRunsCompleted <= C.RAID_GRACE_RUNS) return false;
  return rng() < C.RAID_CHANCE;
}

/** Resolve a raid in place. Consumes ammo, may destroy things. Returns the record. */
export function resolveRaid(s: State, now: number, rng: Rng): RaidRecord {
  const tierIdx = Math.max(0, Math.min(RAID_WAVES.length - 1, s.maxZoneTierReached - 1));
  const wave = RAID_WAVES[tierIdx]!;
  const totalHp = wave.raiders * wave.hp;
  let hp = totalHp;
  let ticks = 0;

  const shotsLeft = new Map<string, number>();
  const fired = new Map<string, { shots: number; damage: number }>();
  for (const t of Object.values(s.turrets)) shotsLeft.set(t.iid, TURRETS[t.def].shots);

  while (hp > 0 && ticks < C.RAID_APPROACH_TICKS) {
    ticks++;
    let anyFired = false;
    for (const t of Object.values(s.turrets)) {
      const left = shotsLeft.get(t.iid) ?? 0;
      if (left <= 0 || t.ammo < C.AMMO_PER_SHOT) continue;
      t.ammo -= C.AMMO_PER_SHOT;
      shotsLeft.set(t.iid, left - 1);
      const dmg = TURRETS[t.def].damage;
      hp -= dmg;
      const f = fired.get(t.iid) ?? { shots: 0, damage: 0 };
      f.shots++; f.damage += dmg;
      fired.set(t.iid, f);
      anyFired = true;
    }
    if (!anyFired) { ticks = C.RAID_APPROACH_TICKS; break; } // nothing can shoot; raiders walk in
  }

  const repelled = hp <= 0;
  const record: RaidRecord = {
    at: now, runIndex: s.lootRunsCompleted, zoneTier: tierIdx + 1,
    raiders: wave.raiders, hpEach: wave.hp, totalHp,
    damageDealt: totalHp - Math.max(0, hp), ticksUsed: ticks, repelled,
    shots: [...fired.entries()].map(([iid, f]) => ({ turretIid: iid, def: s.turrets[iid]!.def, ...f })),
    loss: null,
  };

  if (!repelled) record.loss = applyLoss(s, tierIdx, rng);

  s.raidHistory.unshift(record);
  if (s.raidHistory.length > C.RAID_HISTORY_KEEP) s.raidHistory.length = C.RAID_HISTORY_KEEP;
  return record;
}

function applyLoss(s: State, tierIdx: number, rng: Rng): RaidRecord['loss'] {
  const stealable = RAW_IDS.filter(id => s.res[id] > 0);
  const turretIds = Object.keys(s.turrets);
  const buildingIds = Object.keys(s.buildings);

  const branch = weightedPick(rng, [['steal', 50], ['turret', 35], ['building', 15]] as const);

  if (branch === 'turret' && turretIds.length > 0) {
    const iid = pick(rng, turretIds);
    const def = s.turrets[iid]!.def;
    removeNode(s, 'turret', iid);
    return { kind: 'turret', def };
  }
  if (branch === 'building' && buildingIds.length > 0) {
    const iid = pick(rng, buildingIds);
    const def = s.buildings[iid]!.def;
    removeNode(s, 'building', iid);
    return { kind: 'building', def: BUILDINGS[def].id };
  }
  // Re-roll into steal (or nothing to steal).
  if (stealable.length === 0) return null;
  const resource = pick(rng, stealable);
  const frac = C.RAID_STEAL_BASE + tierIdx * C.RAID_STEAL_PER_TIER;
  const amount = Math.max(1, Math.floor(s.res[resource] * frac));
  s.res[resource] -= amount;
  return { kind: 'steal', resource, amount };
}

/** Remove a building or turret from the world, including its slot and belts. */
export function removeNode(s: State, kind: 'building' | 'turret', iid: string): void {
  if (kind === 'building') delete s.buildings[iid]; else delete s.turrets[iid];
  const idx = s.slots.findIndex(e => e && e.kind === kind && e.iid === iid);
  if (idx >= 0) s.slots[idx] = null;
  removeConveyorsTouching(s, kind, iid);
}

/** Latest raid, only if it belongs to the most recent loot run. */
export function freshRaid(s: State): RaidRecord | null {
  const r = s.raidHistory[0];
  return r && r.runIndex === s.lootRunsCompleted ? r : null;
}
