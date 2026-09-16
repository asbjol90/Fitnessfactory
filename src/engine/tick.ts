import type { GameEvent } from './actions';
import { C } from './constants';
import { RESOURCES } from './data/core';
import { BUILDINGS } from './data/factory';
import { rollContracts } from './contracts';
import { activeRecipes, dailyEnergyBalance, sellBonus, sellLaborCost } from './derive';
import { runRecipe } from './production';
import { dayKey, daysBetween, emptyWeekly, weekKey, type Rng, type State } from './state';

/**
 * Bring the world up to `now`. Runs before every action. Each elapsed calendar
 * day: energy drain, solar, then conveyors (capped by what is actually there —
 * belts never invent resources). Each new Monday: contracts and counters reset.
 */
export function advanceTime(s: State, now: number, rng: Rng, events: GameEvent[]): void {
  const today = dayKey(now);
  const days = daysBetween(s.lastDayKey, today);

  for (let i = 0; i < days; i++) {
    const energyBefore = s.energy;
    const { drain, solar } = dailyEnergyBalance(s);
    s.energy = Math.max(0, s.energy + solar - drain);
    const belts = runConveyors(s, rng);
    events.push({ type: 'day', days: 1, energyBefore, energyAfter: s.energy, belts });
  }
  s.lastDayKey = today;

  const wk = weekKey(now);
  if (wk !== s.weekKey || s.contracts.slots.length === 0) {
    if (wk !== s.weekKey) {
      s.weekKey = wk;
      s.weekly = emptyWeekly();
      s.emergencyUsesThisWeek = 0;
      events.push({ type: 'week' });
    }
    rollContracts(s, rng);
  }
}

function runConveyors(s: State, rng: Rng): Array<{ id: string; moved: number }> {
  const report: Array<{ id: string; moved: number }> = [];
  for (const c of s.conveyors) {
    let moved = 0;
    if (c.to.kind === 'trader') {
      const units = Math.min(c.amount, s.res[c.resource]);
      const laborEach = sellLaborCost(s);
      const affordable = laborEach > 0 ? Math.min(units, Math.floor(s.labor / laborEach)) : units;
      if (affordable > 0) {
        s.res[c.resource] -= affordable;
        s.labor -= affordable * laborEach;
        s.gold += Math.round(affordable * RESOURCES[c.resource].sell * sellBonus(s));
        s.weekly.sold[c.resource] = (s.weekly.sold[c.resource] ?? 0) + affordable;
        moved = affordable;
      }
    } else if (c.to.kind === 'turret') {
      const t = s.turrets[c.to.iid];
      if (t) {
        const room = C.AMMO_CAP - t.ammo;
        const units = Math.min(c.amount, s.res[c.resource], room);
        if (units > 0) { s.res[c.resource] -= units; t.ammo += units; moved = units; }
      }
    } else if (c.to.kind === 'building') {
      const b = s.buildings[c.to.iid];
      if (b) {
        const recipe = BUILDINGS[b.def].recipes.length ? findRecipeFor(s, b.iid, c.resource) : null;
        if (recipe) moved = runRecipe(s, b.iid, recipe, c.amount, rng, /*strict*/ false).units;
      }
    }
    report.push({ id: c.id, moved });
  }
  return report;
}

function findRecipeFor(s: State, iid: string, resource: string): string | null {
  const b = s.buildings[iid];
  if (!b) return null;
  const r = activeRecipes(b).find(r => (r.inputs as Record<string, number>)[resource]);
  return r ? r.id : null;
}
