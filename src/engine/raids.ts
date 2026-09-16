import { C } from './constants';
import { removeConveyorsTouching } from './conveyors';
import type { RaidRecord, Rng, State } from './state';

export function shouldRaid(s: State, rng: Rng): boolean {
  if (s.lootRunsCompleted <= C.RAID_GRACE_RUNS) return false;
  return rng() < C.RAID_CHANCE;
}

/** Remove a building or turret from the world, including its slot, position and belts. */
export function removeNode(s: State, kind: 'building' | 'turret', iid: string): void {
  if (kind === 'building') delete s.buildings[iid]; else { delete s.turrets[iid]; delete s.turretCells[iid]; }
  const idx = s.slots.findIndex(e => e && e.kind === kind && e.iid === iid);
  if (idx >= 0) s.slots[idx] = null;
  removeConveyorsTouching(s, kind, iid);
}

/** Latest raid record if it was fought after the most recent loot run. */
export function freshRaid(s: State): RaidRecord | null {
  const r = s.raidHistory[0];
  return r && s.sessions[0] && r.at >= s.sessions[0].at ? r : null;
}
