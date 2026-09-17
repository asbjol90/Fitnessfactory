import type { Bag, ResourceId, TechId } from './core';

export interface Recipe {
  id: string;
  name: string;
  inputs: Bag;
  output: Bag;
  labor: number;
  energy: number;
  /** Optional side-drop rolled per unit. */
  bonus?: { resource: ResourceId; chance: number };
}

export interface Cost { res: Bag; gold: number; labor: number; research: number; }
const cost = (res: Bag, gold = 0, labor = 0, research = 0): Cost => ({ res, gold, labor, research });

export type Floor = 'main' | 'workshop';

export interface BuildingUpgradeDef {
  id: string;
  name: string;
  tagline: string;
  cost: Cost;
  drain: number;
  recipes: Recipe[];
}

export type Gate =
  | { kind: 'none' }
  | { kind: 'infra'; infra: InfraId[] }
  | { kind: 'upgrade'; building: BuildingId; upgrade: string };

export interface BuildingDef {
  id: BuildingId;
  name: string;
  floor: Floor;
  cost: Cost;
  drain: number;
  recipes: Recipe[];
  gate: Gate;
  /** Mutually exclusive, permanent branch. */
  upgrades: BuildingUpgradeDef[];
}

export type BuildingId =
  | 'furnace' | 'crusher' | 'coke_oven' | 'munitions_press'
  | 'chemical_works' | 'refinery' | 'lapidary' | 'foundry' | 'machine_shop' | 'jeweler' | 'armory';

export type InfraId = 'reinforced_roof' | 'electrical_grid' | 'business_license';
/** Solar panels live on the roof (no slot). Cost per panel. */
export const SOLAR_PANEL = { name: 'Solar Panel', cost: cost({ iron: 10 }, 20, 0, 15), energyPerDay: 3 };
export interface InfraDef { id: InfraId; name: string; cost: Cost; blurb: string; }
export const INFRA: Record<InfraId, InfraDef> = {
  reinforced_roof: { id: 'reinforced_roof', name: 'Reinforced Roof', cost: cost({ iron: 15 }, 60), blurb: 'Required for the Solar Panel.' },
  electrical_grid: { id: 'electrical_grid', name: 'Upgraded Electrical Grid', cost: cost({ iron: 30, coke: 15 }, 120), blurb: 'Powers the Workshop floor.' },
  business_license: { id: 'business_license', name: 'Business License', cost: cost({}, 150), blurb: 'Lets the Workshop trade legally.' },
};

const GRID_LICENSE: Gate = { kind: 'infra', infra: ['electrical_grid', 'business_license'] };

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  furnace: {
    id: 'furnace', name: 'Furnace', floor: 'main',
    cost: cost({ stone: 15, iron_ore: 10 }, 0, 20), drain: 0,
    recipes: [{ id: 'smelt', name: 'Smelt Iron', inputs: { iron_ore: 1 }, output: { iron: 1 }, labor: 3, energy: 2 }],
    gate: { kind: 'none' },
    upgrades: [
      { id: 'blast', name: 'Blast Furnace', tagline: 'Power-hungry, saves Labor', cost: cost({ iron: 15 }, 30), drain: 4,
        recipes: [{ id: 'smelt', name: 'Smelt Iron', inputs: { iron_ore: 1 }, output: { iron: 1 }, labor: 1, energy: 3 }] },
      { id: 'forge', name: 'Forge Works', tagline: 'Muscle over electricity', cost: cost({ iron: 15 }, 30), drain: 1,
        recipes: [{ id: 'smelt', name: 'Smelt Iron', inputs: { iron_ore: 1 }, output: { iron: 1 }, labor: 3, energy: 1 }] },
    ],
  },
  crusher: {
    id: 'crusher', name: 'Crusher', floor: 'main',
    cost: cost({ stone: 20 }, 0, 15), drain: 1,
    recipes: [{ id: 'crush', name: 'Crush Stone', inputs: { stone: 1 }, output: { gravel: 1 }, labor: 2, energy: 1 }],
    gate: { kind: 'none' },
    upgrades: [
      // 1.0 CHANGE: Hydraulic is now Labor-free (was 1L), Sifting costs 2L (was 1L) — a real choice instead of a dominant one.
      { id: 'hydraulic', name: 'Hydraulic Crusher', tagline: 'No Labor at all', cost: cost({ gravel: 8 }, 15), drain: 2,
        recipes: [{ id: 'crush', name: 'Crush Stone', inputs: { stone: 1 }, output: { gravel: 1 }, labor: 0, energy: 2 }] },
      { id: 'sifting', name: 'Sifting Crusher', tagline: 'Finds ore in the rubble', cost: cost({ gravel: 8 }, 15), drain: 1,
        recipes: [{ id: 'crush', name: 'Crush Stone', inputs: { stone: 1 }, output: { gravel: 1 }, labor: 2, energy: 1, bonus: { resource: 'iron_ore', chance: 0.15 } }] },
    ],
  },
  coke_oven: {
    id: 'coke_oven', name: 'Coke Oven', floor: 'main',
    cost: cost({ stone: 15, coal: 10 }, 0, 15), drain: 2,
    recipes: [{ id: 'coke', name: 'Bake Coke', inputs: { coal: 1 }, output: { coke: 1 }, labor: 2, energy: 3 }],
    gate: { kind: 'none' },
    upgrades: [
      { id: 'industrial', name: 'Industrial Coker', tagline: 'Runs on power, not people', cost: cost({ coke: 10 }, 25), drain: 4,
        recipes: [{ id: 'coke', name: 'Bake Coke', inputs: { coal: 1 }, output: { coke: 1 }, labor: 1, energy: 3 }] },
      { id: 'byproduct', name: 'Byproduct Coker', tagline: 'Only source of Coal Tar', cost: cost({ coke: 10 }, 25), drain: 2,
        recipes: [{ id: 'coke', name: 'Bake Coke', inputs: { coal: 1 }, output: { coke: 1 }, labor: 1, energy: 3, bonus: { resource: 'coal_tar', chance: 0.25 } }] },
    ],
  },
  munitions_press: {
    id: 'munitions_press', name: 'Munitions Press', floor: 'main',
    cost: cost({ iron: 12, stone: 10 }, 0, 15), drain: 2,
    recipes: [
      { id: 'cartridges', name: 'Press Cartridges', inputs: { iron: 2, coke: 1 }, output: { cartridges: 12 }, labor: 2, energy: 2 },
      { id: 'hardened', name: 'Harden Rounds (crate)', inputs: { cartridges: 2, precision_components: 1 }, output: { hardened_rounds: 24 }, labor: 3, energy: 3 },
    ],
    gate: { kind: 'none' },
    upgrades: [
      { id: 'heavy', name: 'Heavy Press', tagline: 'Alloy Rounds for the Double Minigun', cost: cost({ precision_components: 2, iron: 20 }, 60), drain: 3,
        recipes: [
          { id: 'cartridges', name: 'Press Cartridges', inputs: { iron: 2, coke: 1 }, output: { cartridges: 12 }, labor: 2, energy: 2 },
          { id: 'hardened', name: 'Harden Rounds (crate)', inputs: { cartridges: 2, precision_components: 1 }, output: { hardened_rounds: 24 }, labor: 3, energy: 3 },
          { id: 'alloy', name: 'Alloy Rounds (crate)', inputs: { hardened_rounds: 4, reinforced_alloy: 1 }, output: { alloy_rounds: 32 }, labor: 4, energy: 5 },
        ] },
    ],
  },
  chemical_works: {
    id: 'chemical_works', name: 'Chemical Works', floor: 'workshop',
    cost: cost({ coal_tar: 15, iron: 10, precision_components: 1 }, 44), drain: 2,
    recipes: [{ id: 'catalyst', name: 'Refine Catalyst', inputs: { coal_tar: 3 }, output: { refined_catalyst: 1 }, labor: 4, energy: 5 }],
    gate: { kind: 'upgrade', building: 'coke_oven', upgrade: 'byproduct' }, upgrades: [],
  },
  refinery: {
    id: 'refinery', name: 'Refinery', floor: 'workshop',
    cost: cost({ iron: 15, gravel: 10, precision_components: 1 }, 50), drain: 3,
    recipes: [
      { id: 'silver', name: 'Refine Silver', inputs: { silver: 1 }, output: { refined_silver: 1 }, labor: 4, energy: 3 },
      { id: 'bullion', name: 'Cast Bullion', inputs: { gold_ore: 1 }, output: { gold_bullion: 1 }, labor: 5, energy: 4 },
    ],
    gate: GRID_LICENSE, upgrades: [],
  },
  lapidary: {
    id: 'lapidary', name: 'Lapidary', floor: 'workshop',
    cost: cost({ iron: 20, coke: 15, hardened_steel: 5, precision_components: 2 }, 75), drain: 2,
    recipes: [{ id: 'cut', name: 'Cut Diamond', inputs: { diamond: 1 }, output: { cut_diamond: 1 }, labor: 8, energy: 6 }],
    gate: GRID_LICENSE, upgrades: [],
  },
  foundry: {
    id: 'foundry', name: 'Foundry', floor: 'workshop',
    cost: cost({ iron: 25, coke: 15, precision_components: 2 }, 38), drain: 3,
    recipes: [
      { id: 'alloy', name: 'Cast Alloy', inputs: { iron: 3, coke: 2, hardened_steel: 1 }, output: { reinforced_alloy: 1 }, labor: 10, energy: 8 },
      // 1.0 CHANGE: Hardened Steel can be made, so alloy is not capped by rare loot.
      { id: 'temper', name: 'Temper Steel', inputs: { iron: 5, coke: 3 }, output: { hardened_steel: 1 }, labor: 8, energy: 8 },
    ],
    gate: GRID_LICENSE, upgrades: [],
  },
  machine_shop: {
    id: 'machine_shop', name: 'Machine Shop', floor: 'workshop',
    cost: cost({ iron: 15, coke: 10 }, 31), drain: 3,
    recipes: [{ id: 'components', name: 'Mill Components', inputs: { iron: 2, coke: 1, gravel: 2 }, output: { precision_components: 1 }, labor: 6, energy: 4 }],
    gate: GRID_LICENSE, upgrades: [],
  },
  jeweler: {
    id: 'jeweler', name: 'Jeweler', floor: 'workshop',
    cost: cost({ gold_bullion: 5, refined_silver: 5, precision_components: 2 }, 75), drain: 3,
    recipes: [{ id: 'jewelry', name: 'Set Jewelry', inputs: { cut_diamond: 1, gold_bullion: 2, refined_silver: 2 }, output: { master_jewelry: 1 }, labor: 12, energy: 8 }],
    gate: GRID_LICENSE, upgrades: [],
  },
  armory: {
    id: 'armory', name: 'Gearsmith', floor: 'workshop',
    cost: cost({ reinforced_alloy: 2, iron: 10, precision_components: 3 }, 112), drain: 4,
    recipes: [
      { id: 'gear_diamond', name: 'Forge Gear (diamond)', inputs: { reinforced_alloy: 2, cut_diamond: 1 }, output: { masterwork_gear: 1 }, labor: 15, energy: 12 },
      { id: 'gear_catalyst', name: 'Forge Gear (catalyst)', inputs: { reinforced_alloy: 2, refined_catalyst: 1 }, output: { masterwork_gear: 1 }, labor: 14, energy: 10 },
    ],
    gate: GRID_LICENSE, upgrades: [],
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

/** Workshop floor unlock: 2 Main-floor buildings OR 3 completed contracts. */
export const WORKSHOP_UNLOCK = { mainBuildings: 2, contracts: 3 };

// ---------------------------------------------------------------- Turrets
export type TurretId = 'scrap_launcher' | 'shotgun' | 'assault_rifle' | 'minigun' | 'double_minigun';
export interface TurretDef {
  id: TurretId; name: string; ammo: ResourceId; cost: Cost; tier: number; blurb: string;
}
export const TURRETS: Record<TurretId, TurretDef> = {
  scrap_launcher: { id: 'scrap_launcher', name: 'Scrap Launcher', tier: 1, blurb: 'Lobs ore. Cheap chip damage near the entry.', ammo: 'iron_ore', cost: cost({ iron_ore: 20 }, 0, 15) },
  shotgun: { id: 'shotgun', name: 'Shotgun', tier: 2, blurb: 'Brutal at point blank, useless further out.', ammo: 'iron', cost: cost({ iron: 15 }, 20) },
  assault_rifle: { id: 'assault_rifle', name: 'Assault Rifle', tier: 3, blurb: 'Long reach, steady damage. Covers the whole approach.', ammo: 'cartridges', cost: cost({ coke: 15, iron: 10 }, 35) },
  minigun: { id: 'minigun', name: 'Minigun', tier: 4, blurb: 'Two shots a tick. Eats ammo, melts groups.', ammo: 'hardened_rounds', cost: cost({ precision_components: 5 }, 80) },   // 1.0 CHANGE: gold was 60
  double_minigun: { id: 'double_minigun', name: 'Double Minigun', tier: 5, blurb: 'The answer to the Ashen Reach.', ammo: 'alloy_rounds', cost: cost({ reinforced_alloy: 3 }, 130) },   // 1.0 CHANGE: gold was 100
};
export const TURRET_IDS = Object.keys(TURRETS) as TurretId[];

/** Techs referenced by the factory for effects. */
export const TECH_EFFECT: Record<'lootBonus' | 'laborBonus' | 'energyBonus' | 'sellBonus', Array<[TechId, number]>> = {
  lootBonus: [['basic_metallurgy', 0.08], ['advanced_metallurgy', 0.12]],
  laborBonus: [['field_training', 0.08]],
  energyBonus: [['industrial_synthesis', 0.15]],
  sellBonus: [['trade_network', 0.12]],
};
