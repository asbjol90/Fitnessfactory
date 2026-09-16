import type { ResourceId, TechId } from './core';
import type { BuildingId } from './factory';

export type ContractGoal =
  | { kind: 'deliver'; resource: ResourceId; amount: number }      // paid from stock on claim
  | { kind: 'produce'; resource: ResourceId; amount: number }      // weekly units produced
  | { kind: 'earn'; pool: 'labor' | 'energy'; amount: number }     // weekly earned from training
  | { kind: 'stockpile'; resource: ResourceId | 'energy'; amount: number } // checked at claim
  | { kind: 'find_premium'; amount: number }                       // weekly premium drops
  | { kind: 'venture'; minTier: number; amount: number }           // weekly successful runs at tier ≥
  | { kind: 'sell'; resource: ResourceId; amount: number }         // weekly units sold
  | { kind: 'spend_in'; building: BuildingId; pool: 'labor' | 'energy'; amount: number }; // weekly spend inside a building

export type ContractGate =
  | { kind: 'always' }
  | { kind: 'building'; building: BuildingId }
  | { kind: 'zone'; minTierReached: number }
  | { kind: 'upgrade'; building: BuildingId; upgrade: string }
  | { kind: 'tech'; tech: TechId };

export interface ContractDef { id: string; title: string; reward: number; goal: ContractGoal; gate: ContractGate; }

const always: ContractGate = { kind: 'always' };
const c = (id: string, title: string, reward: number, goal: ContractGoal, gate: ContractGate = always): ContractDef =>
  ({ id, title, reward, goal, gate });

/**
 * 24 contracts. Building-gated amounts are a 1.0 ASSUMPTION — v1 doc gives only
 * the reward range (20–35 Gold), not the units.
 */
export const CONTRACTS: ContractDef[] = [
  // Always available (9)
  c('deliver_ore', 'Deliver 20 Iron Ore', 15, { kind: 'deliver', resource: 'iron_ore', amount: 20 }),
  c('refine_iron', 'Smelt 8 Iron this week', 18, { kind: 'produce', resource: 'iron', amount: 8 }),
  c('labor_60', 'Earn 60 Labor this week', 15, { kind: 'earn', pool: 'labor', amount: 60 }),
  c('energy_40', 'Earn 40 Energy this week', 15, { kind: 'earn', pool: 'energy', amount: 40 }),
  c('stock_ore', 'Hold 30 Iron Ore', 18, { kind: 'stockpile', resource: 'iron_ore', amount: 30 }),
  c('stock_energy', 'Hold 35 Energy', 18, { kind: 'stockpile', resource: 'energy', amount: 35 }),
  c('find_premium', 'Find a premium resource', 20, { kind: 'find_premium', amount: 1 }),
  c('venture_ridge', 'Venture past the Outskirts twice', 20, { kind: 'venture', minTier: 2, amount: 2 }),
  c('deliver_gravel', 'Deliver 15 Gravel', 16, { kind: 'deliver', resource: 'gravel', amount: 15 }),
  // Building-gated (8)
  c('prod_silver', 'Refine 3 Silver', 20, { kind: 'produce', resource: 'refined_silver', amount: 3 }, { kind: 'building', building: 'refinery' }),
  c('prod_bullion', 'Cast 3 Gold Bullion', 24, { kind: 'produce', resource: 'gold_bullion', amount: 3 }, { kind: 'building', building: 'refinery' }),
  c('prod_diamond', 'Cut a Diamond', 30, { kind: 'produce', resource: 'cut_diamond', amount: 1 }, { kind: 'building', building: 'lapidary' }),
  c('prod_components', 'Mill 3 Precision Components', 24, { kind: 'produce', resource: 'precision_components', amount: 3 }, { kind: 'building', building: 'machine_shop' }),
  c('prod_jewelry', 'Finish a piece of Master Jewelry', 35, { kind: 'produce', resource: 'master_jewelry', amount: 1 }, { kind: 'building', building: 'jeweler' }),
  c('prod_alloy', 'Cast 2 Reinforced Alloy', 30, { kind: 'produce', resource: 'reinforced_alloy', amount: 2 }, { kind: 'building', building: 'foundry' }),
  c('prod_gear', 'Forge one Masterwork Gear', 35, { kind: 'produce', resource: 'masterwork_gear', amount: 1 }, { kind: 'building', building: 'armory' }),
  c('prod_catalyst', 'Refine 2 Catalyst', 28, { kind: 'produce', resource: 'refined_catalyst', amount: 2 }, { kind: 'building', building: 'chemical_works' }),
  // Zone-gated (3)
  c('venture_quarry', 'Venture into the Quarry or deeper twice', 24, { kind: 'venture', minTier: 3, amount: 2 }, { kind: 'zone', minTierReached: 3 }),
  c('venture_hollow', 'Venture into the Hollow or deeper twice', 30, { kind: 'venture', minTier: 4, amount: 2 }, { kind: 'zone', minTierReached: 4 }),
  c('venture_reach', 'Reach the Ashen Reach', 35, { kind: 'venture', minTier: 5, amount: 1 }, { kind: 'zone', minTierReached: 5 }),
  // Upgrade-gated (3)
  c('blast_push', 'Push 70 Energy through the Blast Furnace', 26, { kind: 'spend_in', building: 'furnace', pool: 'energy', amount: 70 }, { kind: 'upgrade', building: 'furnace', upgrade: 'blast' }),
  c('forge_push', 'Push 90 Labor through the Forge Works', 26, { kind: 'spend_in', building: 'furnace', pool: 'labor', amount: 90 }, { kind: 'upgrade', building: 'furnace', upgrade: 'forge' }),
  c('deliver_tar', 'Deliver 10 Coal Tar', 18, { kind: 'deliver', resource: 'coal_tar', amount: 10 }, { kind: 'upgrade', building: 'coke_oven', upgrade: 'byproduct' }),
  // Research-gated (1)
  c('sell_iron', 'Sell 15 Iron', 20, { kind: 'sell', resource: 'iron', amount: 15 }, { kind: 'tech', tech: 'trade_network' }),
];

export const contractById = (id: string): ContractDef => {
  const d = CONTRACTS.find(c => c.id === id);
  if (!d) throw new Error(`unknown contract ${id}`);
  return d;
};
