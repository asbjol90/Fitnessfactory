import type { AvatarId, Bag, HabitId, ResourceId, StatId, TechId } from './data/core';
import type { BuildingId, InfraId, TurretId } from './data/factory';
import type { Intensity, NodeRef, RaidRecord, SessionKind } from './state';

export type Action =
  | { type: 'pick_avatar'; id: AvatarId; name: string }
  | { type: 'log_session'; kind: SessionKind; minutes: number; intensity: Intensity; zone?: string; note?: string }
  | { type: 'log_habit'; habit: HabitId }
  | { type: 'build'; building: BuildingId; slot?: number }
  | { type: 'upgrade_building'; iid: string; upgrade: string }
  | { type: 'demolish'; kind: 'building' | 'turret'; iid: string }
  | { type: 'produce'; iid: string; recipe: string; units: number }
  | { type: 'sell'; resource: ResourceId; units: number }
  | { type: 'buy'; resource: ResourceId; units: number }
  | { type: 'build_turret'; turret: TurretId; slot?: number }
  | { type: 'load_ammo'; iid: string }
  | { type: 'move'; from: number; to: number }
  | { type: 'add_conveyor'; from: NodeRef; to: NodeRef; resource: ResourceId }
  | { type: 'upgrade_conveyor'; id: string }
  | { type: 'remove_conveyor'; id: string }
  | { type: 'research'; tech: TechId }
  | { type: 'build_infra'; infra: InfraId }
  | { type: 'build_solar' }
  | { type: 'upgrade_factory' }
  | { type: 'claim_contract'; id: string }
  | { type: 'buy_contract_slot' }
  | { type: 'craft_gear'; stat: StatId }
  | { type: 'emergency_energy' }
  | { type: 'upgrade_wall' }
  | { type: 'place_turret'; iid: string; cell: number }
  | { type: 'unplace_turret'; iid: string }
  | { type: 'build_barricade'; cell: number }
  | { type: 'remove_barricade'; cell: number }
  | { type: 'raid_tick'; rally: boolean }
  | { type: 'tick' };

/** Everything the UI might want to animate or toast. */
export type GameEvent =
  | { type: 'session'; kind: SessionKind; minutes: number; counted: number }
  | { type: 'habit'; habit: HabitId; research: number }
  | { type: 'gain'; pool: 'labor' | 'energy' | 'research' | 'gold'; amount: number }
  | { type: 'loot'; zone: string; outcome: 'success' | 'salvage' | 'failed'; yield: Bag; premium: ResourceId | null; steel: boolean; pity: boolean; research: number; gearDrop: StatId | null }
  | { type: 'raid_teaser' }
  | { type: 'raid_pending' }
  | { type: 'raid'; record: RaidRecord }
  | { type: 'wall'; tier: number }
  | { type: 'barricade'; op: 'built' | 'removed'; cell: number }
  | { type: 'turret_placed'; iid: string; cell: number | null }
  | { type: 'level_up'; stat: StatId; level: number }
  | { type: 'built'; building: BuildingId; iid: string; slot: number }
  | { type: 'upgraded'; building: BuildingId; upgrade: string }
  | { type: 'demolished'; kind: 'building' | 'turret'; name: string; refund: number }
  | { type: 'produced'; iid: string; recipe: string; units: number; output: Bag; bonus: Bag }
  | { type: 'sold'; resource: ResourceId; units: number; gold: number }
  | { type: 'bought'; resource: ResourceId; units: number; gold: number }
  | { type: 'turret_built'; turret: TurretId; iid: string; slot: number }
  | { type: 'ammo'; iid: string; added: number }
  | { type: 'moved'; from: number; to: number; beltsRemoved: number }
  | { type: 'conveyor'; op: 'added' | 'removed' | 'upgraded'; id: string }
  | { type: 'tech'; tech: TechId }
  | { type: 'infra'; infra: InfraId }
  | { type: 'solar'; count: number }
  | { type: 'factory_size'; level: number }
  | { type: 'contract_done'; id: string; reward: number }
  | { type: 'contract_slot'; cost: number }
  | { type: 'gear'; stat: StatId; tier: number }
  | { type: 'day'; days: number; energyBefore: number; energyAfter: number; belts: Array<{ id: string; moved: number }> }
  | { type: 'week' }
  | { type: 'emergency_energy'; cost: number; amount: number };
