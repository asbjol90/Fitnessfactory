import { RESOURCES, type ResourceId } from './data/core';
import { TURRETS } from './data/factory';
import { activeRecipes } from './derive';
import type { Conveyor, NodeRef, State } from './state';
import { GameError } from './errors';

export const sameNode = (a: NodeRef, b: NodeRef) =>
  a.kind === b.kind && ('iid' in a ? a.iid : '') === ('iid' in b ? b.iid : '');

/** Throws if a belt carrying `resource` from → to makes no sense. */
export function validateConveyor(s: State, from: NodeRef, to: NodeRef, resource: ResourceId): void {
  if (sameNode(from, to)) throw new GameError('A belt needs two different ends.');
  if (from.kind === 'trader') throw new GameError('The Trader only receives goods.');
  if (from.kind === 'turret') throw new GameError('Turrets only receive ammo.');
  if (to.kind === 'stock' && from.kind !== 'building') throw new GameError('Only a machine can send goods back to the Stockpile.');
  if (from.kind === 'building') {
    const b = s.buildings[from.iid];
    if (!b) throw new GameError('That building is gone.');
    if (!activeRecipes(b).some(r => r.output[resource])) throw new GameError(`${RESOURCES[resource].name} does not come out of that building.`);
  }
  if (to.kind === 'building') {
    const b = s.buildings[to.iid];
    if (!b) throw new GameError('That building is gone.');
    if (!activeRecipes(b).some(r => r.inputs[resource])) throw new GameError(`That building has no use for ${RESOURCES[resource].name}.`);
  }
  if (to.kind === 'turret') {
    const t = s.turrets[to.iid];
    if (!t) throw new GameError('That turret is gone.');
    if (TURRETS[t.def].ammo !== resource) throw new GameError(`${TURRETS[t.def].name} fires ${RESOURCES[TURRETS[t.def].ammo].name}, not ${RESOURCES[resource].name}.`);
  }
  // One belt per resource between any two nodes. Different sources into the same machine are fine (two furnaces feeding one shop).
  if (s.conveyors.some(c => sameNode(c.from, from) && sameNode(c.to, to) && c.resource === resource)) throw new GameError('A belt already carries that between these two. Upgrade it instead.');
}

export function removeConveyorsTouching(s: State, kind: 'building' | 'turret', iid: string): number {
  const before = s.conveyors.length;
  s.conveyors = s.conveyors.filter(c => !(touches(c.from, kind, iid) || touches(c.to, kind, iid)));
  return before - s.conveyors.length;
}
const touches = (n: NodeRef, kind: string, iid: string) => n.kind === kind && 'iid' in n && n.iid === iid;

/** Belts whose target no longer accepts their resource (e.g. after a turret swap). */
export function staleConveyors(s: State): Conveyor[] {
  return s.conveyors.filter(c => {
    try { validateConveyorTarget(s, c); return false; } catch { return true; }
  });
}
function validateConveyorTarget(s: State, c: Conveyor): void {
  if (c.to.kind === 'turret') {
    const t = s.turrets[c.to.iid];
    if (!t || TURRETS[t.def].ammo !== c.resource) throw new GameError('stale');
  }
  if (c.to.kind === 'building') {
    const b = s.buildings[c.to.iid];
    if (!b || !activeRecipes(b).some(r => r.inputs[c.resource])) throw new GameError('stale');
  }
}

