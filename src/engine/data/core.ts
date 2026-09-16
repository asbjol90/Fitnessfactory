// ---------------------------------------------------------------- Resources
export const RESOURCE_IDS = [
  'iron_ore', 'coal', 'stone',
  'silver', 'gold_ore', 'diamond',
  'hardened_steel',
  'iron', 'gravel', 'coke', 'coal_tar', 'refined_silver', 'gold_bullion',
  'precision_components', 'cut_diamond', 'refined_catalyst', 'reinforced_alloy',
  'master_jewelry', 'masterwork_gear',
] as const;
export type ResourceId = typeof RESOURCE_IDS[number];

export type ResourceTier = 'raw' | 'premium' | 'rare' | 'refined';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  tier: ResourceTier;
  sell: number;
  buyable: boolean;
}

const r = (id: ResourceId, name: string, tier: ResourceTier, sell: number, buyable = false): ResourceDef =>
  ({ id, name, tier, sell, buyable });

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  iron_ore: r('iron_ore', 'Iron Ore', 'raw', 1, true),
  coal: r('coal', 'Coal', 'raw', 1, true),
  stone: r('stone', 'Stone', 'raw', 1, true),
  silver: r('silver', 'Silver', 'premium', 5),
  gold_ore: r('gold_ore', 'Gold Ore', 'premium', 8),
  diamond: r('diamond', 'Diamond', 'premium', 20),
  hardened_steel: r('hardened_steel', 'Hardened Steel', 'rare', 35),
  iron: r('iron', 'Iron', 'refined', 4, true),
  gravel: r('gravel', 'Gravel', 'refined', 3, true),
  coke: r('coke', 'Coke', 'refined', 4, true),
  coal_tar: r('coal_tar', 'Coal Tar', 'refined', 6),
  refined_silver: r('refined_silver', 'Refined Silver', 'refined', 12),
  gold_bullion: r('gold_bullion', 'Gold Bullion', 'refined', 20),
  precision_components: r('precision_components', 'Precision Components', 'refined', 25),
  cut_diamond: r('cut_diamond', 'Cut Diamond', 'refined', 45),
  refined_catalyst: r('refined_catalyst', 'Refined Catalyst', 'refined', 40),
  reinforced_alloy: r('reinforced_alloy', 'Reinforced Alloy', 'refined', 60),
  master_jewelry: r('master_jewelry', 'Master Jewelry', 'refined', 160),
  masterwork_gear: r('masterwork_gear', 'Masterwork Gear', 'refined', 220),
};

export const RAW_IDS: ResourceId[] = ['iron_ore', 'coal', 'stone'];
/** Premium find weights (from v1: 60/30/10). */
export const PREMIUM_WEIGHTS: Array<[ResourceId, number]> = [['silver', 6], ['gold_ore', 3], ['diamond', 1]];

// ---------------------------------------------------------------- Nutrition habits
export type HabitId = 'water' | 'morning_water' | 'no_junk' | 'balanced_meal';
export interface HabitDef { id: HabitId; label: string; research: number; dailyCap: number; }
export const HABITS: Record<HabitId, HabitDef> = {
  water: { id: 'water', label: 'A glass of water', research: 1, dailyCap: 8 },
  morning_water: { id: 'morning_water', label: 'Started the day with water', research: 2, dailyCap: 1 },
  no_junk: { id: 'no_junk', label: 'No junk food or candy today', research: 4, dailyCap: 1 },
  balanced_meal: { id: 'balanced_meal', label: 'A balanced meal', research: 3, dailyCap: 3 },
};
export const HABIT_IDS = Object.keys(HABITS) as HabitId[];

/** Partial bag of resources, e.g. a cost or a yield. */
export type Bag = Partial<Record<ResourceId, number>>;

// ---------------------------------------------------------------- Zones
export interface ZoneDef { id: string; name: string; tier: number; requiredSpeed: number; lootMult: number; }
export const ZONES: ZoneDef[] = [
  { id: 'outskirts', name: 'Trailhead Outskirts', tier: 1, requiredSpeed: 0, lootMult: 1.0 },
  { id: 'ridgeline', name: 'Overgrown Ridgeline', tier: 2, requiredSpeed: 1, lootMult: 1.3 },
  { id: 'quarry', name: 'The Fractured Quarry', tier: 3, requiredSpeed: 2, lootMult: 1.7 },
  { id: 'hollow', name: 'Deep Hollow', tier: 4, requiredSpeed: 3, lootMult: 2.2 },
  { id: 'reach', name: 'The Ashen Reach', tier: 5, requiredSpeed: 4, lootMult: 2.8 },
];
export const zoneById = (id: string): ZoneDef => {
  const z = ZONES.find(z => z.id === id);
  if (!z) throw new Error(`unknown zone ${id}`);
  return z;
};
/** Zones where the direct gear-tier drop can roll. */
export const GEAR_DROP_ZONES = new Set(['hollow', 'reach']);

// ---------------------------------------------------------------- Avatar
export type StatId = 'speed' | 'strength' | 'energy' | 'research';
export const STAT_IDS: StatId[] = ['speed', 'strength', 'energy', 'research'];

/** Cumulative-volume thresholds for natural level 1..5. */
export const STAT_THRESHOLDS: Record<StatId, readonly number[]> = {
  speed: [0, 180, 500, 1000, 2000],
  strength: [0, 150, 400, 900, 1800],
  energy: [0, 180, 500, 1000, 2000],
  research: [0, 50, 150, 350, 700],
};

export interface GearDef { stat: StatId; name: string; material: ResourceId; tierCosts: readonly number[]; }
export const GEAR: Record<StatId, GearDef> = {
  speed: { stat: 'speed', name: 'Field Armor', material: 'reinforced_alloy', tierCosts: [2, 5, 9, 14] },
  strength: { stat: 'strength', name: 'Work Tools', material: 'precision_components', tierCosts: [2, 5, 9, 14] },
  energy: { stat: 'energy', name: 'Power Cells', material: 'refined_catalyst', tierCosts: [2, 5, 9, 14] },
  research: { stat: 'research', name: "Scholar's Kit", material: 'master_jewelry', tierCosts: [1, 3, 6, 10] },
};

export const AVATAR_IDS = [
  'm1_worker', 'm2_soldier', 'm3_scavenger', 'm4_scholar',
  'f1_worker', 'f2_soldier', 'f3_scavenger', 'f4_scholar',
] as const;
export type AvatarId = typeof AVATAR_IDS[number];

// ---------------------------------------------------------------- Research
export type TechId =
  | 'conveyor_systems' | 'basic_metallurgy' | 'basic_logistics' | 'field_training'
  | 'advanced_metallurgy' | 'trade_network' | 'endurance_training' | 'industrial_synthesis';

export interface TechDef { id: TechId; name: string; tier: 1 | 2 | 3; cost: number; requires: TechId[]; effect: string; }
export const TECHS: Record<TechId, TechDef> = {
  conveyor_systems: { id: 'conveyor_systems', name: 'Conveyor Systems', tier: 1, cost: 15, requires: [], effect: 'Unlocks conveyor belts' },
  basic_metallurgy: { id: 'basic_metallurgy', name: 'Basic Metallurgy', tier: 1, cost: 10, requires: [], effect: '+8% loot yield' },
  basic_logistics: { id: 'basic_logistics', name: 'Basic Logistics', tier: 1, cost: 10, requires: [], effect: 'Selling no longer costs Labor' },
  field_training: { id: 'field_training', name: 'Field Training', tier: 1, cost: 12, requires: [], effect: '+8% Labor generation' },
  advanced_metallurgy: { id: 'advanced_metallurgy', name: 'Advanced Metallurgy', tier: 2, cost: 25, requires: ['basic_metallurgy'], effect: '+12% loot yield' },
  trade_network: { id: 'trade_network', name: 'Trade Network', tier: 2, cost: 25, requires: ['basic_logistics'], effect: '+12% Gold from selling' },
  endurance_training: { id: 'endurance_training', name: 'Endurance Training', tier: 2, cost: 25, requires: ['field_training'], effect: 'Third weekly contract slot' },
  industrial_synthesis: { id: 'industrial_synthesis', name: 'Industrial Synthesis', tier: 3, cost: 50, requires: ['advanced_metallurgy', 'trade_network'], effect: '+15% Energy generation' },
};

// ---------------------------------------------------------------- Factory size
export interface FactorySizeDef { level: number; interior: number; wall: number; cost: Bag; gold: number; }
export const FACTORY_SIZES: FactorySizeDef[] = [
  { level: 1, interior: 4, wall: 2, cost: {}, gold: 0 },
  { level: 2, interior: 7, wall: 3, cost: { iron: 30, gravel: 20 }, gold: 150 },
  { level: 3, interior: 10, wall: 4, cost: { iron: 60, coke: 30 }, gold: 350 },
  { level: 4, interior: 12, wall: 5, cost: { iron: 100, coke: 60, gold_bullion: 5 }, gold: 600 },
];
