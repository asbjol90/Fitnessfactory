// Produces a mid-game save for screenshots / manual testing: npm run seed > save.json
import { initialState, reduce, seededRng, pathOf, cellIndex, type Action, type State } from '../src/engine';
import { createRaid } from '../src/engine/defence';
const rng = seededRng(5); let now = Date.now() - 20 * 86400000;
let s: State = initialState(now);
const act = (a: Action) => { const r = reduce(s, a, { now, rng }); if (r.error) console.error(a.type, r.error); else s = r.state; };
act({ type: 'pick_avatar', id: 'f3_scavenger', name: 'Asbjørn' });
s = { ...s, gold: 620, labor: 220, energy: 90, research: 80, res: { ...s.res, iron_ore: 64, coal: 40, stone: 55, iron: 60, gravel: 22, coke: 18, silver: 3, hardened_steel: 2, precision_components: 12 } };
act({ type: 'build', building: 'furnace' }); act({ type: 'build', building: 'crusher' }); act({ type: 'build', building: 'coke_oven' }); act({ type: 'build', building: 'munitions_press' });
act({ type: 'build_infra', infra: 'reinforced_roof' }); act({ type: 'build_solar' });
const f = Object.values(s.buildings).find(b => b.def === 'furnace')!; act({ type: 'upgrade_building', iid: f.iid, upgrade: 'forge' });
act({ type: 'research', tech: 'conveyor_systems' }); act({ type: 'research', tech: 'basic_logistics' });
act({ type: 'build_turret', turret: 'scrap_launcher' }); act({ type: 'build_turret', turret: 'shotgun' });
for (const t of Object.values(s.turrets)) { act({ type: 'load_ammo', iid: t.iid }); act({ type: 'load_ammo', iid: t.iid }); }
const c = Object.values(s.buildings).find(b => b.def === 'crusher')!;
act({ type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'building', iid: f.iid }, resource: 'iron_ore' });
act({ type: 'add_conveyor', from: { kind: 'building', iid: f.iid }, to: { kind: 'trader' }, resource: 'iron' });
act({ type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'building', iid: c.iid }, resource: 'stone' });
const t0 = Object.values(s.turrets)[0]!; act({ type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'turret', iid: t0.iid }, resource: 'iron_ore' });
act({ type: 'craft_gear', stat: 'strength' }); act({ type: 'craft_gear', stat: 'strength' });
s = { ...s, res: { ...s.res, iron: s.res.iron + 40, gravel: s.res.gravel + 10, precision_components: s.res.precision_components + 2 } };
act({ type: 'upgrade_conveyor', id: s.conveyors[0]!.id }); act({ type: 'upgrade_conveyor', id: s.conveyors[0]!.id }); act({ type: 'upgrade_conveyor', id: s.conveyors[1]!.id });
s = { ...s, avatar: { ...s.avatar, volume: { speed: 620, strength: 210, energy: 140, research: 60 }, gear: { ...s.avatar.gear, speed: 2, energy: 3, research: 1 } }, lootRunsCompleted: 9, maxZoneTierReached: 2 };
for (let i = 0; i < 6; i++) { now += 86400000 * 2; act({ type: 'log_session', kind: i % 3 === 0 ? 'strength' : i % 3 === 1 ? 'flexibility' : 'cardio', minutes: 30 + i * 5, intensity: 'medium', zone: 'ridgeline' }); }
s = { ...s, raidHistory: [{ at: now, runIndex: s.lootRunsCompleted, zoneTier: 2, raiders: 3, hpEach: 6, totalHp: 18, damageDealt: 18, ticksUsed: 2, repelled: true, shots: [{ turretIid: t0.iid, def: 'scrap_launcher', shots: 2, damage: 8 }], loss: null }, ...s.raidHistory] };
// Defence: wall 2, place both turrets beside the road, a barricade, then a pending raid at tier 2.
s = { ...s, gold: s.gold + 200, res: { ...s.res, stone: 80, gravel: 60 } };
act({ type: 'upgrade_wall' });
{
  const road = pathOf(s);
  const ids = Object.keys(s.turrets);
  const beside = (k: number) => cellIndex({ c: road[k]!.c + 1, r: road[k]!.r });
  act({ type: 'place_turret', iid: ids[0]!, cell: beside(2) });
  act({ type: 'place_turret', iid: ids[1]!, cell: cellIndex({ c: road[6]!.c, r: road[6]!.r - 1 }) });
  act({ type: 'build_barricade', cell: cellIndex(road[4]!) });
  s = { ...s, pendingRaid: createRaid({ ...s, maxZoneTierReached: 2 }, 4242, now) };
}
process.stdout.write(JSON.stringify(s));
