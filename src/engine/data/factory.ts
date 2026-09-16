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
  /** Passive energy per day (Solar Panel). */
  passiveEnergy?: number;
}

export type BuildingId =
  | 'furnace' | 'crusher' | 'coke_oven'
  | 'chemical_works' | 'refinery' | 'lapidary' | 'foundry' | 'machine_shop' | 'jeweler' | 'armory' | 'solar_panel';

export type InfraId = 'reinforced_roof' | 'electrical_grid' | 'business_license';
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
      { id: 'hydraulic', name: 'Hydraulic Crusher', tagline: 'Half the Labor', cost: cost({ gravel: 8 }, 15), drain: 2,
        recipes: [{ id: 'crush', name: 'Crush Stone', inputs: { stone: 1 }, output: { gravel: 1 }, labor: 1, energy: 1 }] },
      { id: 'sifting', name: 'Sifting Crusher', tagline: 'Finds ore in the rubble', cost: cost({ gravel: 8 }, 15), drain: 1,
        recipes: [{ id: 'crush', name: 'Crush Stone', inputs: { stone: 1 }, output: { gravel: 1 }, labor: 1, energy: 1, bonus: { resource: 'iron_ore', chance: 0.15 } }] },
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
  chemical_works: {
    id: 'chemical_works', name: 'Chemical Works', floor: 'workshop',
    cost: cost({ coal_tar: 15, iron: 10 }, 35), drain: 2,
    recipes: [{ id: 'catalyst', name: 'Refine Catalyst', inputs: { coal_tar: 3 }, output: { refined_catalyst: 1 }, labor: 4, energy: 5 }],
    gate: { kind: 'upgrade', building: 'coke_oven', upgrade: 'byproduct' }, upgrades: [],
  },
  refinery: {
    id: 'refinery', name: 'Refinery', floor: 'workshop',
    cost: cost({ iron: 15, gravel: 10 }, 40), drain: 3,
    recipes: [
      { id: 'silver', name: 'Refine Silver', inputs: { silver: 1 }, output: { refined_silver: 1 }, labor: 4, energy: 3 },
      { id: 'bullion', name: 'Cast Bullion', inputs: { gold_ore: 1 }, output: { gold_bullion: 1 }, labor: 5, energy: 4 },
    ],
    gate: GRID_LICENSE, upgrades: [],
  },
  lapidary: {
    id: 'lapidary', name: 'Lapidary', floor: 'workshop',
    cost: cost({ iron: 20, coke: 15, hardened_steel: 5 }, 60), drain: 2,
    recipes: [{ id: 'cut', name: 'Cut Diamond', inputs: { diamond: 1 }, output: { cut_diamond: 1 }, labor: 8, energy: 6 }],
    gate: GRID_LICENSE, upgrades: [],
  },
  foundry: {
    id: 'foundry', name: 'Foundry', floor: 'workshop',
    cost: cost({ iron: 25, coke: 15 }, 30), drain: 3,
    recipes: [{ id: 'alloy', name: 'Cast Alloy', inputs: { iron: 3, coke: 2, hardened_steel: 1 }, output: { reinforced_alloy: 1 }, labor: 10, energy: 8 }],
    gate: GRID_LICENSE, upgrades: [],
  },
  machine_shop: {
    id: 'machine_shop', name: 'Machine Shop', floor: 'workshop',
    cost: cost({ iron: 15, coke: 10 }, 25), drain: 3,
    recipes: [{ id: 'components', name: 'Mill Components', inputs: { iron: 2, coke: 1, gravel: 2 }, output: { precision_components: 1 }, labor: 6, energy: 4 }],
    gate: GRID_LICENSE, upgrades: [],
  },
  jeweler: {
    id: 'jeweler', name: 'Jeweler', floor: 'workshop',
    cost: cost({ gold_bullion: 5, refined_silver: 5 }, 60), drain: 3,
    recipes: [{ id: 'jewelry', name: 'Set Jewelry', inputs: { cut_diamond: 1, gold_bullion: 2, refined_silver: 2 }, output: { master_jewelry: 1 }, labor: 12, energy: 8 }],
    gate: GRID_LICENSE, upgrades: [],
  },
  armory: {
    id: 'armory', name: 'Armory', floor: 'workshop',
    cost: cost({ reinforced_alloy: 2, iron: 10 }, 90), drain: 4,
    recipes: [
      { id: 'gear_diamond', name: 'Forge Gear (diamond)', inputs: { reinforced_alloy: 2, cut_diamond: 1 }, output: { masterwork_gear: 1 }, labor: 15, energy: 12 },
      { id: 'gear_catalyst', name: 'Forge Gear (catalyst)', inputs: { reinforced_alloy: 2, refined_catalyst: 1 }, output: { masterwork_gear: 1 }, labor: 14, energy: 10 },
    ],
    gate: GRID_LICENSE, upgrades: [],
  },
  solar_panel: {
    id: 'solar_panel', name: 'Solar Panel', floor: 'workshop',
    cost: cost({ iron: 10 }, 20, 0, 15), drain: 0, recipes: [],
    gate: { kind: 'infra', infra: ['reinforced_roof'] }, upgrades: [], passiveEnergy: 3,
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

/** Workshop floor unlock: 2 Main-floor buildings OR 3 completed contracts. */
export const WORKSHOP_UNLOCK = { mainBuildings: 2, contracts: 3 };

// ---------------------------------------------------------------- Turrets
export type TurretId = 'scrap_launcher' | 'shotgun' | 'assault_rifle' | 'minigun' | 'double_minigun';
export interface TurretDef {
  id: TurretId; name: string; shots: number; damage: number; ammo: ResourceId; cost: Cost; tier: number;
}
export const TURRETS: Record<TurretId, TurretDef> = {
  scrap_launcher: { id: 'scrap_launcher', name: 'Scrap Launcher', tier: 1, shots: 2, damage: 4, ammo: 'iron_ore', cost: cost({ iron_ore: 20 }, 0, 15) },
  shotgun: { id: 'shotgun', name: 'Shotgun', tier: 2, shots: 2, damage: 8, ammo: 'iron', cost: cost({ iron: 15 }, 20) },
  assault_rifle: { id: 'assault_rifle', name: 'Assault Rifle', tier: 3, shots: 8, damage: 5, ammo: 'coke', cost: cost({ coke: 15, iron: 10 }, 35) },
  minigun: { id: 'minigun', name: 'Minigun', tier: 4, shots: 10, damage: 8, ammo: 'precision_components', cost: cost({ precision_components: 5 }, 60) },
  double_minigun: { id: 'double_minigun', name: 'Double Minigun', tier: 5, shots: 10, damage: 15, ammo: 'reinforced_alloy', cost: cost({ reinforced_alloy: 3 }, 100) },
};
export const TURRET_IDS = Object.keys(TURRETS) as TurretId[];

/** Raid wave per zone tier (index = tier-1). */
export const RAID_WAVES: Array<{ raiders: number; hp: number }> = [
  { raiders: 2, hp: 2 }, { raiders: 3, hp: 6 }, { raiders: 5, hp: 8 }, { raiders: 10, hp: 10 }, { raiders: 10, hp: 20 },
];

/** Techs referenced by the factory for effects. */
export const TECH_EFFECT: Record<'lootBonus' | 'laborBonus' | 'energyBonus' | 'sellBonus', Array<[TechId, number]>> = {
  lootBonus: [['basic_metallurgy', 0.08], ['advanced_metallurgy', 0.12]],
  laborBonus: [['field_training', 0.08]],
  energyBonus: [['industrial_synthesis', 0.15]],
  sellBonus: [['trade_network', 0.12]],
};
