import { CONTRACTS, contractById, type ContractDef, type ContractGate, type ContractGoal } from './data/contracts';
import { contractSlotCount, hasBuilding, hasTech, hasUpgrade } from './derive';
import { hasBag, subBag, type Rng, type State } from './state';

export function gateOpen(s: State, g: ContractGate): boolean {
  switch (g.kind) {
    case 'always': return true;
    case 'building': return hasBuilding(s, g.building);
    case 'zone': return s.maxZoneTierReached >= g.minTierReached;
    case 'upgrade': return hasUpgrade(s, g.building, g.upgrade);
    case 'tech': return hasTech(s, g.tech);
  }
}

/** Fill this week's slots from the eligible pool. Keeps order stable. */
export function rollContracts(s: State, rng: Rng): void {
  const pool = CONTRACTS.filter(c => gateOpen(s, c.gate));
  const n = Math.min(contractSlotCount(s), pool.length);
  const chosen: ContractDef[] = [];
  const bag = [...pool];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * bag.length);
    chosen.push(bag.splice(idx, 1)[0]!);
  }
  s.contracts.slots = chosen.map(c => ({ id: c.id, done: false }));
}

/** If a third slot appears mid-week (Endurance Training), add one more. */
export function topUpContracts(s: State, rng: Rng): void {
  const want = contractSlotCount(s);
  if (s.contracts.slots.length >= want) return;
  const taken = new Set(s.contracts.slots.map(c => c.id));
  const pool = CONTRACTS.filter(c => gateOpen(s, c.gate) && !taken.has(c.id));
  while (s.contracts.slots.length < want && pool.length) {
    const idx = Math.floor(rng() * pool.length);
    s.contracts.slots.push({ id: pool.splice(idx, 1)[0]!.id, done: false });
  }
}

/** Current progress 0..amount for display; `ready` when claimable. */
export function contractProgress(s: State, id: string): { current: number; target: number; ready: boolean } {
  const goal = contractById(id).goal;
  const w = s.weekly;
  const target = goal.amount;
  let current: number;
  switch (goal.kind) {
    case 'deliver': current = s.res[goal.resource]; break;
    case 'produce': current = w.produced[goal.resource] ?? 0; break;
    case 'earn': current = goal.pool === 'labor' ? w.laborEarned : w.energyEarned; break;
    case 'stockpile': current = goal.resource === 'energy' ? s.energy : s.res[goal.resource]; break;
    case 'find_premium': current = w.premiumFound; break;
    case 'venture': current = w.ventures.filter(t => t >= goal.minTier).length; break;
    case 'sell': current = w.sold[goal.resource] ?? 0; break;
    case 'spend_in': current = w.spendIn[goal.building]?.[goal.pool] ?? 0; break;
  }
  return { current: Math.min(current, target), target, ready: current >= target };
}

/** Apply the cost side of claiming (deliver contracts hand over goods). */
export function payContract(s: State, goal: ContractGoal): void {
  if (goal.kind === 'deliver') {
    if (!hasBag(s.res, { [goal.resource]: goal.amount })) throw new Error('not enough to deliver');
    subBag(s.res, { [goal.resource]: goal.amount });
  }
}
