import type { Bag } from './data/core';
import { activeRecipes, haulingLabor } from './derive';
import { GameError } from './errors';
import { addBag, addToBag, subBag, timesAffordable, type Rng, type State } from './state';

export interface ProduceResult { units: number; output: Bag; bonus: Bag; }
export { haulingLabor };

/**
 * Run `recipeId` on building `iid` up to `want` times. In strict mode (manual
 * button) it throws if even one unit is unaffordable; in lenient mode
 * (conveyors) it runs as many as it can and returns the count.
 */
export function runRecipe(s: State, iid: string, recipeId: string, want: number, rng: Rng, strict: boolean): ProduceResult {
  const b = s.buildings[iid];
  if (!b) throw new GameError('That building is gone.');
  const recipe = activeRecipes(b).find(r => r.id === recipeId);
  if (!recipe) throw new GameError('That recipe is not available here.');
  if (!Number.isInteger(want) || want <= 0) throw new GameError('Choose how many to make.');

  const byMaterials = timesAffordable(s.res, recipe.inputs);
  const byEnergy = recipe.energy > 0 ? Math.floor(s.energy / recipe.energy) : Infinity;
  // Labor includes hauling for anything not on a belt; find the largest count we can pay for.
  const laborFor = (n: number) => recipe.labor * n + haulingLabor(s, iid, recipe, n);
  let units = Math.min(want, byMaterials, byEnergy);
  while (units > 0 && laborFor(units) > s.labor) units--;

  if (strict && units < want) {
    if (byMaterials < want) throw new GameError('Not enough materials.');
    if (byEnergy < want) throw new GameError(`Needs ${recipe.energy * want} Energy.`);
    const haul = haulingLabor(s, iid, recipe, want);
    throw new GameError(`Needs ${laborFor(want)} Labor${haul ? ` (${haul} of it hauling — lay belts to skip that)` : ''}.`);
  }
  if (units <= 0) return { units: 0, output: {}, bonus: {} };

  const labor = laborFor(units);
  subBag(s.res, recipe.inputs, units);
  s.labor -= labor;
  s.energy -= recipe.energy * units;
  addBag(s.res, recipe.output, units);

  // Strength stat grows with Labor *spent*, hauling included.
  s.avatar.volume.strength += labor;

  s.lastRunDay[iid] = s.lastDayKey;
  const spend = (s.weekly.spendIn[b.def] ??= { labor: 0, energy: 0 });
  spend.labor += labor;
  spend.energy += recipe.energy * units;

  const output: Bag = {};
  for (const [id, n] of Object.entries(recipe.output) as Array<[keyof typeof s.res, number]>) {
    output[id] = n * units;
    addToBag(s.weekly.produced, id, n * units);
  }

  const bonus: Bag = {};
  if (recipe.bonus) {
    let hits = 0;
    for (let i = 0; i < units; i++) if (rng() < recipe.bonus.chance) hits++;
    if (hits > 0) {
      s.res[recipe.bonus.resource] += hits;
      bonus[recipe.bonus.resource] = hits;
      addToBag(s.weekly.produced, recipe.bonus.resource, hits);
    }
  }
  return { units, output, bonus };
}
