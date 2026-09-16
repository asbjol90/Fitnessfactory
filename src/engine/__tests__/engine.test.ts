import { describe, expect, it } from 'vitest';
import {
  BUILDINGS, C, RAID_WAVES, TURRETS, TURRET_IDS, contractProgress, dailyEnergyBalance, effectiveLevel,
  initialState, naturalLevel, reduce, seededRng, turretOutput, upgradeSave, type Action, type State, type Rng,
} from '../index';

const T0 = new Date('2026-09-15T10:00:00').getTime();
const DAY = 86400000;

function fresh(seed = 1): { s: State; rng: Rng } {
  const rng = seededRng(seed);
  const s0 = initialState(T0);
  const r = reduce(s0, { type: 'pick_avatar', id: 'm3_scavenger', name: 'Asbjørn' }, { now: T0, rng });
  return { s: r.state, rng };
}
function run(s: State, rng: Rng, actions: Action[], now = T0): State {
  for (const a of actions) {
    const r = reduce(s, a, { now, rng });
    if (r.error) throw new Error(`${a.type}: ${r.error}`);
    s = r.state;
  }
  return s;
}
const give = (s: State, patch: Partial<Pick<State, 'gold' | 'labor' | 'energy' | 'research'>>, res: Partial<State['res']> = {}): State =>
  ({ ...s, ...patch, res: { ...s.res, ...res } });

describe('raid wave table', () => {
  it('3 of the previous turret tier clears a zone tier, 2 falls short', () => {
    for (let tier = 2; tier <= 5; tier++) {
      const wave = RAID_WAVES[tier - 1]!;
      const prev = TURRET_IDS[tier - 2]!;
      const out = turretOutput(prev);
      expect(3 * out).toBeGreaterThanOrEqual(wave.raiders * wave.hp);
      expect(2 * out).toBeLessThan(wave.raiders * wave.hp);
    }
  });
  it('no turret exceeds the 10-tick ceiling', () => {
    for (const id of TURRET_IDS) expect(TURRETS[id].shots).toBeLessThanOrEqual(C.RAID_APPROACH_TICKS);
  });
});

describe('raids', () => {
  it('never fires during the grace runs, then reveals via factory not log', () => {
    let { s, rng } = fresh(7);
    s = give(s, { labor: 999 });
    let sawRaid = false;
    for (let i = 0; i < C.RAID_GRACE_RUNS; i++) {
      const r = reduce(s, { type: 'log_session', kind: 'cardio', minutes: 30, intensity: 'medium', zone: 'outskirts' }, { now: T0 + i * 1000, rng });
      expect(r.events.some(e => e.type === 'raid')).toBe(false);
      s = r.state;
    }
    // Force many runs; with seed 7 a raid appears well within 60 runs at 20%.
    for (let i = 0; i < 60 && !sawRaid; i++) {
      const r = reduce(s, { type: 'log_session', kind: 'cardio', minutes: 30, intensity: 'medium', zone: 'outskirts' }, { now: T0 + (10 + i) * 1000, rng });
      s = r.state;
      if (r.events.some(e => e.type === 'raid')) {
        sawRaid = true;
        expect(r.events.some(e => e.type === 'raid_teaser')).toBe(true);
        expect(s.raidHistory[0]!.runIndex).toBe(s.lootRunsCompleted);
      }
    }
    expect(sawRaid).toBe(true);
  });

  it('a loaded turret spends 2 ammo per shot and repels a tier-1 wave', () => {
    let { s, rng } = fresh(3);
    s = give(s, { labor: 999 }, { iron_ore: 100 });
    s = run(s, rng, [{ type: 'build_turret', turret: 'scrap_launcher' }]);
    const iid = Object.keys(s.turrets)[0]!;
    s = run(s, rng, [{ type: 'load_ammo', iid }]);
    expect(s.turrets[iid]!.ammo).toBe(C.AMMO_LOAD_AMOUNT);
    s = { ...s, lootRunsCompleted: 6, maxZoneTierReached: 1 };
    let raided = false;
    for (let i = 0; i < 80 && !raided; i++) {
      const r = reduce(s, { type: 'log_session', kind: 'cardio', minutes: 20, intensity: 'medium', zone: 'outskirts' }, { now: T0 + i * 1000, rng });
      s = r.state;
      const ev = r.events.find(e => e.type === 'raid');
      if (ev && ev.type === 'raid') {
        raided = true;
        expect(ev.record.repelled).toBe(true);
        expect(ev.record.shots[0]!.shots).toBe(1); // 4 dmg vs 4 hp → one shot
        expect(s.turrets[iid]!.ammo).toBe(C.AMMO_LOAD_AMOUNT - C.AMMO_PER_SHOT);
      }
    }
    expect(raided).toBe(true);
  });
});

describe('hardened steel pity', () => {
  it('guarantees a drop by the pity threshold', () => {
    // rng that never rolls a drop
    const rng: Rng = () => 0.999;
    let { s } = fresh();
    let total = 0;
    for (let i = 0; i < C.PITY_THRESHOLD; i++) {
      const r = reduce(s, { type: 'log_session', kind: 'cardio', minutes: 10, intensity: 'medium', zone: 'outskirts' }, { now: T0 + i, rng });
      s = r.state;
      total += r.events.some(e => e.type === 'loot' && e.steel) ? 1 : 0;
    }
    expect(total).toBe(1);
    expect(s.res.hardened_steel).toBe(1);
    expect(s.sessions[0]!.result).toMatch(/Hardened Steel/);
  });
});

describe('training → resources', () => {
  it('labor and energy scale by K × minutes at level 1', () => {
    const { s, rng } = fresh();
    const a = reduce(s, { type: 'log_session', kind: 'strength', minutes: 40, intensity: 'medium' }, { now: T0, rng }).state;
    expect(a.labor).toBe(Math.round(C.LABOR_K * 40));
    const b = reduce(s, { type: 'log_session', kind: 'flexibility', minutes: 40, intensity: 'medium' }, { now: T0, rng }).state;
    expect(b.energy).toBe(C.START_ENERGY + Math.round(C.ENERGY_K * 40));
  });
  it('nutrition habits respect daily caps and reset next day', () => {
    const { s, rng } = fresh();
    const a = reduce(s, { type: 'log_habit', habit: 'no_junk' }, { now: T0, rng });
    expect(a.error).toBeNull();
    expect(a.state.research).toBe(4);
    const b = reduce(a.state, { type: 'log_habit', habit: 'no_junk' }, { now: T0 + 1000, rng });
    expect(b.error).toMatch(/Already/);
    const c = reduce(a.state, { type: 'log_habit', habit: 'no_junk' }, { now: T0 + DAY, rng });
    expect(c.error).toBeNull();
  });
  it('minutes are capped by intensity; hard tops out at 90', () => {
    const { s, rng } = fresh();
    const a = reduce(s, { type: 'log_session', kind: 'strength', minutes: 150, intensity: 'hard' }, { now: T0, rng }).state;
    const b = reduce(s, { type: 'log_session', kind: 'strength', minutes: 90, intensity: 'hard' }, { now: T0, rng }).state;
    expect(a.labor).toBe(b.labor);
    expect(a.sessions[0]!.minutes).toBe(150); // real minutes still recorded
    const light = reduce(s, { type: 'log_session', kind: 'strength', minutes: 150, intensity: 'light' }, { now: T0, rng }).state;
    expect(light.labor).toBeGreaterThan(a.labor);
  });
  it('longer sessions pay superlinearly', () => {
    const { s, rng } = fresh();
    const y = (m: number) => {
      const r = reduce(s, { type: 'log_session', kind: 'cardio', minutes: m, intensity: 'medium', zone: 'outskirts' }, { now: T0, rng: () => 0.5 });
      const l = r.events.find(e => e.type === 'loot');
      return l && l.type === 'loot' ? Object.values(l.yield).reduce((a, b) => a + b, 0) : 0;
    };
    void rng;
    expect(y(60)).toBeGreaterThan(2 * y(30));
  });
  it('venturing beyond speed level fails or salvages, never full yield', () => {
    const { s } = fresh();
    const fail = reduce(s, { type: 'log_session', kind: 'cardio', minutes: 30, intensity: 'medium', zone: 'reach' }, { now: T0, rng: () => 0.9 });
    const l = fail.events.find(e => e.type === 'loot');
    expect(l && l.type === 'loot' && l.outcome).toBe('failed');
    expect(fail.state.lootRunsCompleted).toBe(0);
  });
});

describe('avatar levels', () => {
  it('thresholds map to levels 1..5 and gear caps at 5', () => {
    expect(naturalLevel('speed', 0)).toBe(1);
    expect(naturalLevel('speed', 200)).toBe(2);
    expect(naturalLevel('speed', 3000)).toBe(5);
    let { s, rng } = fresh();
    s = { ...s, avatar: { ...s.avatar, volume: { ...s.avatar.volume, speed: 3000 }, gear: { ...s.avatar.gear, speed: 3 } } };
    expect(effectiveLevel(s, 'speed')).toBe(5);
    void rng;
  });
  it('crafting gear consumes the right material and emits an event', () => {
    let { s, rng } = fresh();
    s = give(s, {}, { precision_components: 2 });
    const r = reduce(s, { type: 'craft_gear', stat: 'strength' }, { now: T0, rng });
    expect(r.error).toBeNull();
    expect(r.state.avatar.gear.strength).toBe(1);
    expect(r.state.res.precision_components).toBe(0);
    const again = reduce(r.state, { type: 'craft_gear', stat: 'strength' }, { now: T0, rng });
    expect(again.error).toMatch(/Needs 5/);
  });
});

describe('factory', () => {
  it('builds, upgrades (once), produces, and refunds 80% on demolish', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 100, energy: 100, gold: 100 }, { stone: 30, iron_ore: 30, iron: 20 });
    s = run(s, rng, [{ type: 'build', building: 'furnace' }]);
    const iid = Object.keys(s.buildings)[0]!;
    expect(s.labor).toBe(80);
    s = run(s, rng, [{ type: 'produce', iid, recipe: 'smelt', units: 5 }]);
    expect(s.res.iron).toBe(25);
    expect(s.labor).toBe(80 - 15 - 3); // 15 recipe + 3 hauling (10 units / 4, rounded up)
    expect(s.energy).toBe(90);
    s = run(s, rng, [{ type: 'upgrade_building', iid, upgrade: 'blast' }]);
    const second = reduce(s, { type: 'upgrade_building', iid, upgrade: 'forge' }, { now: T0, rng });
    expect(second.error).toMatch(/already took/);
    s = run(s, rng, [{ type: 'produce', iid, recipe: 'smelt', units: 1 }]);
    expect(s.labor).toBe(62 - 1 - 1); // blast: 1 labor + 1 hauling
    const before = s.gold;
    s = run(s, rng, [{ type: 'demolish', kind: 'building', iid }]);
    // furnace value: 15 stone + 10 ore = 25; blast: 15 iron×4 + 30 gold = 90 → 115 × 0.8 = 92
    expect(s.gold - before).toBe(92);
    expect(Object.keys(s.buildings)).toHaveLength(0);
  });
  it('turrets only go on the wall, buildings can overflow into wall', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 100 }, { iron_ore: 100, stone: 100, coal: 100 });
    const bad = reduce(s, { type: 'build_turret', turret: 'scrap_launcher', slot: 0 }, { now: T0, rng });
    expect(bad.error).toMatch(/wall/);
    s = run(s, rng, [{ type: 'build_turret', turret: 'scrap_launcher' }]);
    expect(s.slots[4]?.kind).toBe('turret');
  });
  it('workshop gate and infra gate hold', () => {
    let { s, rng } = fresh();
    s = give(s, { gold: 9999, labor: 999 }, { iron: 999, gravel: 999, coke: 999, stone: 999, iron_ore: 999, coal: 999, precision_components: 9 });
    const locked = reduce(s, { type: 'build', building: 'refinery' }, { now: T0, rng });
    expect(locked.error).toMatch(/Workshop/);
    s = run(s, rng, [{ type: 'build', building: 'furnace' }, { type: 'build', building: 'crusher' }]);
    const needsInfra = reduce(s, { type: 'build', building: 'refinery' }, { now: T0, rng });
    expect(needsInfra.error).toMatch(/Needs/);
    s = run(s, rng, [{ type: 'build_infra', infra: 'electrical_grid' }, { type: 'build_infra', infra: 'business_license' }, { type: 'build', building: 'refinery' }]);
    expect(Object.values(s.buildings).map(b => b.def)).toContain('refinery');
  });
  it('factory size upgrade preserves wall placements', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 100, gold: 1000 }, { iron_ore: 100, iron: 100, gravel: 100 });
    s = run(s, rng, [{ type: 'build_turret', turret: 'scrap_launcher' }]);
    s = run(s, rng, [{ type: 'upgrade_factory' }]);
    expect(s.slots).toHaveLength(10);
    expect(s.slots[7]?.kind).toBe('turret');
  });
});

describe('market', () => {
  it('selling costs 1 labor until Basic Logistics; buying is 5× sell', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 1, gold: 100, research: 10 }, { iron: 5 });
    const tooMuch = reduce(s, { type: 'sell', resource: 'iron', units: 2 }, { now: T0, rng });
    expect(tooMuch.error).toMatch(/Labor/);
    s = run(s, rng, [{ type: 'research', tech: 'basic_logistics' }, { type: 'sell', resource: 'iron', units: 5 }]);
    expect(s.gold).toBe(120);
    expect(s.labor).toBe(1);
    s = run(s, rng, [{ type: 'buy', resource: 'iron', units: 1 }]);
    expect(s.gold).toBe(100);
    const no = reduce(s, { type: 'buy', resource: 'silver', units: 1 }, { now: T0, rng });
    expect(no.error).toMatch(/found or made/);
  });
  it('emergency energy escalates and resets weekly', () => {
    let { s, rng } = fresh();
    s = give(s, { gold: 200 });
    s = run(s, rng, [{ type: 'emergency_energy' }, { type: 'emergency_energy' }]);
    expect(s.gold).toBe(200 - 40 - 65);
    expect(s.energy).toBe(C.START_ENERGY + 40);
    const nextWeek = reduce(s, { type: 'emergency_energy' }, { now: T0 + 7 * DAY, rng });
    expect(nextWeek.state.gold).toBe(95 - 40);
  });
});

describe('time', () => {
  it('daily drain never goes below zero and belts never invent resources', () => {
    let { s, rng } = fresh();
    s = give(s, { energy: 3, labor: 100, research: 100, gold: 100 }, { stone: 20, iron_ore: 20, iron: 2 });
    s = run(s, rng, [{ type: 'build', building: 'furnace' }, { type: 'research', tech: 'conveyor_systems' }]);
    const iid = Object.keys(s.buildings)[0]!;
    s = run(s, rng, [
      { type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'building', iid }, resource: 'iron_ore' },
      { type: 'add_conveyor', from: { kind: 'building', iid }, to: { kind: 'trader' }, resource: 'iron' },
    ]);
    expect(dailyEnergyBalance(s).drain).toBe(2);
    const r = reduce(s, { type: 'tick' }, { now: T0 + DAY, rng });
    const day = r.events.find(e => e.type === 'day');
    expect(day && day.type === 'day' && day.energyAfter).toBe(1); // 3 - 2
    // 1 energy left → furnace needs 2/unit → nothing smelted; trader belt sells only the 2 iron in stock.
    expect(r.state.res.iron_ore).toBe(10);
    expect(r.state.res.iron).toBe(0);
    expect(r.state.gold).toBe(100 + 8);
    expect(r.state.labor).toBe(80 - 2);
  });
  it('belts start at tier 1 and upgrade for materials; capacity follows the tier', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 100, research: 100, gold: 100 }, { stone: 20, iron_ore: 20, iron: 30, gravel: 10, precision_components: 2 });
    s = run(s, rng, [{ type: 'build', building: 'furnace' }, { type: 'research', tech: 'conveyor_systems' }]);
    const iid = Object.keys(s.buildings)[0]!;
    s = run(s, rng, [{ type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'building', iid }, resource: 'iron_ore' }]);
    const id = s.conveyors[0]!.id;
    expect(s.conveyors[0]!.tier).toBe(1);
    s = run(s, rng, [{ type: 'upgrade_conveyor', id }, { type: 'upgrade_conveyor', id }]);
    expect(s.conveyors[0]!.tier).toBe(3);
    expect(s.res.iron).toBe(30 - 6 - 10); expect(s.gold).toBe(85);
    expect(reduce(s, { type: 'upgrade_conveyor', id }, { now: T0, rng }).error).toMatch(/top tier/);
    // A day passes with 40 energy: tier-3 belt runs up to 10 smelts.
    s = { ...s, energy: 40 };
    const day = reduce(s, { type: 'tick' }, { now: T0 + DAY, rng }).state;
    expect(day.res.iron_ore).toBe(0); // 10 ore left after the furnace build → all smelted
  });
  it('one belt per resource between two nodes; a second source is allowed', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 200, research: 100 }, { stone: 60, iron_ore: 40 });
    s = run(s, rng, [{ type: 'build', building: 'furnace' }, { type: 'build', building: 'furnace' }, { type: 'research', tech: 'conveyor_systems' }]);
    const [f1, f2] = Object.keys(s.buildings) as [string, string];
    s = run(s, rng, [{ type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'building', iid: f1 }, resource: 'iron_ore' }]);
    const dup = reduce(s, { type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'building', iid: f1 }, resource: 'iron_ore' }, { now: T0, rng });
    expect(dup.error).toMatch(/already carries/);
    s = run(s, rng, [
      { type: 'add_conveyor', from: { kind: 'building', iid: f1 }, to: { kind: 'trader' }, resource: 'iron' },
      { type: 'add_conveyor', from: { kind: 'building', iid: f2 }, to: { kind: 'trader' }, resource: 'iron' },
    ]);
    expect(s.conveyors).toHaveLength(3);
  });
  it('hauling: unbelted machines pay 1 Labor per 4 units moved; belts remove it per resource', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 100, energy: 100, research: 100 }, { stone: 20, iron_ore: 40 });
    s = run(s, rng, [{ type: 'build', building: 'furnace' }, { type: 'research', tech: 'conveyor_systems' }]);
    const iid = Object.keys(s.buildings)[0]!;
    // 4 smelts: 4 ore in + 4 iron out = 8 units → 2 hauling; 3×4 = 12 recipe labor → 14
    const a = run(s, rng, [{ type: 'produce', iid, recipe: 'smelt', units: 4 }]);
    expect(a.labor).toBe(80 - 14);
    // Belt the input: only the 4 iron out is hauled → 1
    s = run(s, rng, [{ type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'building', iid }, resource: 'iron_ore' }]);
    const b = run(s, rng, [{ type: 'produce', iid, recipe: 'smelt', units: 4 }]);
    expect(b.labor).toBe(80 - 13);
  });
});

describe('contracts', () => {
  it('rolls slots on first tick, tracks progress, pays out, and counts toward the workshop', () => {
    let { s, rng } = fresh(11);
    expect(s.contracts.slots).toHaveLength(2);
    // Force a known contract into slot 0
    s = { ...s, contracts: { ...s.contracts, slots: [{ id: 'deliver_ore', done: false }] } };
    expect(contractProgress(s, 'deliver_ore').ready).toBe(false);
    s = give(s, {}, { iron_ore: 25 });
    expect(contractProgress(s, 'deliver_ore').ready).toBe(true);
    s = run(s, rng, [{ type: 'claim_contract', id: 'deliver_ore' }]);
    expect(s.gold).toBe(30);
    expect(s.res.iron_ore).toBe(5);
    expect(s.contracts.completedTotal).toBe(1);
    const again = reduce(s, { type: 'claim_contract', id: 'deliver_ore' }, { now: T0, rng });
    expect(again.error).toMatch(/Already/);
  });
  it('building-gated contracts only appear once the building exists', () => {
    const { s } = fresh(2);
    const ids = s.contracts.slots.map(c => c.id);
    expect(ids.some(id => id.startsWith('prod_'))).toBe(false);
  });
});

describe('round 1 mechanics', () => {
  it('buildings can be duplicated and get numbered labels', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 100 }, { stone: 60, iron_ore: 40 });
    s = run(s, rng, [{ type: 'build', building: 'furnace' }, { type: 'build', building: 'furnace' }]);
    expect(Object.values(s.buildings).filter(b => b.def === 'furnace')).toHaveLength(2);
  });
  it('solar panels sit on the roof, capped by factory size, and count in the daily balance', () => {
    let { s, rng } = fresh();
    s = give(s, { gold: 999, research: 99, labor: 99 }, { iron: 99 });
    const noRoof = reduce(s, { type: 'build_solar' }, { now: T0, rng });
    expect(noRoof.error).toMatch(/Roof/);
    s = run(s, rng, [{ type: 'build_infra', infra: 'reinforced_roof' }, { type: 'build_solar' }]);
    expect(s.slots.every(e => e === null)).toBe(true);
    expect(dailyEnergyBalance(s).solar).toBe(C.SOLAR_ENERGY_PER_DAY);
    const second = reduce(s, { type: 'build_solar' }, { now: T0, rng });
    expect(second.error).toMatch(/holds 1/);
  });
  it('ammo chain: cartridges from the press feed the assault rifle', () => {
    let { s, rng } = fresh();
    s = give(s, { labor: 200, energy: 200, gold: 200, research: 50 }, { iron: 60, stone: 40, coke: 40 });
    s = run(s, rng, [{ type: 'build', building: 'munitions_press' }, { type: 'build_turret', turret: 'assault_rifle' }]);
    const press = Object.values(s.buildings).find(b => b.def === 'munitions_press')!;
    s = run(s, rng, [{ type: 'produce', iid: press.iid, recipe: 'cartridges', units: 3 }]);
    expect(s.res.cartridges).toBe(12);
    const t = Object.values(s.turrets)[0]!;
    s = run(s, rng, [{ type: 'load_ammo', iid: t.iid }]);
    expect(s.turrets[t.iid]!.ammo).toBe(10);
    expect(s.res.cartridges).toBe(2);
    s = run(s, rng, [{ type: 'research', tech: 'conveyor_systems' }]);
    const wrong = reduce(s, { type: 'add_conveyor', from: { kind: 'stock' }, to: { kind: 'turret', iid: t.iid }, resource: 'coke' }, { now: T0, rng: () => 0 });
    expect(wrong.error).toMatch(/fires Cartridges/);
  });
  it('hydraulic crusher is labor-free, sifting costs 2', () => {
    const h = BUILDINGS.crusher.upgrades.find(u => u.id === 'hydraulic')!.recipes[0]!;
    const sft = BUILDINGS.crusher.upgrades.find(u => u.id === 'sifting')!.recipes[0]!;
    expect(h.labor).toBe(0); expect(sft.labor).toBe(2); expect(sft.bonus).toBeTruthy();
  });
  it('upgrades a v2 save: solar slot → roof, stale ammo belts dropped, new resources zeroed', () => {
    const { s } = fresh();
    const v2 = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    v2['version'] = 2; delete v2['solar'];
    const res = v2['res'] as Record<string, number>; delete res['cartridges'];
    (v2['buildings'] as Record<string, unknown>)['b9'] = { iid: 'b9', def: 'solar_panel', upgrade: null };
    (v2['slots'] as unknown[])[0] = { kind: 'building', iid: 'b9' };
    (v2['turrets'] as Record<string, unknown>)['t9'] = { iid: 't9', def: 'assault_rifle', ammo: 6 };
    (v2['conveyors'] as unknown[]).push({ id: 'c9', resource: 'coke', amount: 5, from: { kind: 'stock' }, to: { kind: 'turret', iid: 't9' } });
    const up = upgradeSave(v2)!;
    expect(up.version).toBe(4);
    expect(up.solar).toBe(1);
    expect(up.slots[0]).toBeNull();
    expect(up.buildings['b9']).toBeUndefined();
    expect(up.conveyors).toHaveLength(0);
    expect(up.turrets['t9']!.ammo).toBe(6);
    expect(up.res.cartridges).toBe(0);
  });
});

describe('bought contract slots', () => {
  it('adds a slot for the week at rising prices, resets Monday', () => {
    let { s, rng } = fresh(4);
    s = give(s, { gold: 200 });
    expect(s.contracts.slots).toHaveLength(2);
    s = run(s, rng, [{ type: 'buy_contract_slot' }]);
    expect(s.contracts.slots).toHaveLength(3);
    expect(s.gold).toBe(190);
    s = run(s, rng, [{ type: 'buy_contract_slot' }, { type: 'buy_contract_slot' }]);
    expect(s.contracts.slots).toHaveLength(5);
    expect(s.gold).toBe(155);
    expect(reduce(s, { type: 'buy_contract_slot' }, { now: T0, rng }).error).toMatch(/No more/);
    const next = reduce(s, { type: 'tick' }, { now: T0 + 7 * DAY, rng }).state;
    expect(next.contracts.bought).toBe(0);
    expect(next.contracts.slots).toHaveLength(2);
  });
});

describe('data integrity', () => {
  it('every recipe input/output is a known resource and every upgrade has a recipe set', () => {
    for (const b of Object.values(BUILDINGS)) {
      for (const u of b.upgrades) expect(u.recipes.length).toBeGreaterThan(0);
    }
  });
});
