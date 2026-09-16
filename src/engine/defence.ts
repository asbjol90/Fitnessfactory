/**
 * Tower-defence raid. A raid is created (pending) after a loot run and blocks
 * further loot runs until fought. The fight advances one tick per `raid_tick`
 * action so the UI can animate it and the player can Rally mid-fight. It is
 * deterministic for a given seed, so replays and tests are exact.
 */
import { C } from './constants';
import { GEAR_DROP_ZONES, PREMIUM_WEIGHTS, STAT_IDS, ZONES, type Bag, type ResourceId, type StatId } from './data/core';
import {
  BARRICADE, DROPS, GATE, MAX_TICKS, RALLY, RAIDERS, SPAWN_PER_TICK, TURRET_COMBAT, cellFromIndex, cellIndex, chebyshev, waveDef, wallDef,
  type Cell, type RaiderType,
} from './data/defence';
import { BUILDINGS, TURRETS, type BuildingId, type TurretId } from './data/factory';
import { removeConveyorsTouching } from './conveyors';
import { addBag, pick, seededRng, weightedPick, type Rng, type State } from './state';

// ---------------------------------------------------------------- Types
export interface Raider { id: number; type: RaiderType; hp: number; maxHp: number; pos: number; alive: boolean; breached: boolean; spawnTick: number; }
export interface Shot { turretIid: string; targetId: number; damage: number; }
export interface TickLog { shots: Shot[]; rally: number; barricadeHits: number; wallHits: number; kills: number[]; breaches: number[]; }
export interface Fight {
  tick: number;
  raiders: Raider[];
  wallHp: number;
  rallyCooldown: number;
  rallies: number;
  last: TickLog;
  done: RaidOutcome | null;
}
export interface RaidOutcome {
  repelled: boolean; killed: number; breached: number; ticks: number;
  loss: null | { kind: 'steal'; resource: ResourceId; amount: number } | { kind: 'turret'; def: TurretId } | { kind: 'building'; def: BuildingId };
  drops: Bag; gearDrop: StatId | null;
}
export interface PendingRaid { seed: number; zoneTier: number; startedAt: number; fight: Fight; }
export interface RaidRecordV2 { at: number; zoneTier: number; outcome: RaidOutcome; wave: Array<{ type: RaiderType; count: number }>; }

// ---------------------------------------------------------------- Geometry helpers
export const pathOf = (s: State): Cell[] => wallDef(s.wall).path;
export const isPathCell = (s: State, i: number) => pathOf(s).some(c => cellIndex(c) === i);
export const isWallCell = (i: number) => cellFromIndex(i).r === GATE.r;
/** Cells a turret may occupy: on the field, not on the road, not the wall row. */
export const placeable = (s: State, i: number) => !isPathCell(s, i) && !isWallCell(i) && !Object.values(s.turretCells).includes(i);
/** Path cells a barricade may occupy: at least two steps out from the gate. */
export const barricadeable = (s: State, i: number) => {
  const p = pathOf(s);
  const at = p.findIndex(c => cellIndex(c) === i);
  return at >= 0 && at < p.length - 2 && !s.barricades.some(b => b.cell === i);
};

// ---------------------------------------------------------------- Create
export function createRaid(s: State, seed: number, now: number): PendingRaid {
  const tier = Math.max(1, s.maxZoneTierReached);
  const wave = waveDef(tier);
  const rng = seededRng(seed);
  const raiders: Raider[] = [];
  let id = 1;
  const pool: Array<{ type: RaiderType; hp: number }> = [];
  for (const g of wave.groups) for (let i = 0; i < g.count; i++) pool.push({ type: g.type, hp: g.hp });
  // Shuffle so brutes aren't always last.
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j]!, pool[i]!]; }
  pool.forEach((r, i) => raiders.push({ id: id++, type: r.type, hp: r.hp, maxHp: r.hp, pos: -1, alive: true, breached: false, spawnTick: Math.floor(i / SPAWN_PER_TICK) }));
  return {
    seed, zoneTier: tier, startedAt: now,
    fight: { tick: 0, raiders, wallHp: wallDef(s.wall).hp, rallyCooldown: 0, rallies: 0, last: emptyLog(), done: null },
  };
}
const emptyLog = (): TickLog => ({ shots: [], rally: 0, barricadeHits: 0, wallHits: 0, kills: [], breaches: [] });

// ---------------------------------------------------------------- Tick
/** Advance the pending fight by one tick. Mutates state (turret ammo, barricades, labor for rally). */
export function tickRaid(s: State, rally: boolean): void {
  const pr = s.pendingRaid;
  if (!pr || pr.fight.done) return;
  const f = pr.fight;
  const path = pathOf(s);
  const gateIdx = path.length - 1;
  const rng = seededRng(pr.seed * 7919 + f.tick);
  const log = emptyLog();
  f.tick++;

  // Spawn
  for (const r of f.raiders) if (r.pos < 0 && r.spawnTick < f.tick) r.pos = 0;

  // Rally: workers hold the gate for a tick.
  if (rally && f.rallyCooldown === 0 && s.labor >= RALLY.labor) {
    s.labor -= RALLY.labor;
    s.avatar.volume.strength += RALLY.labor;
    f.rallyCooldown = RALLY.cooldown + 1;
    f.rallies++;
    let dmg = RALLY.damage;
    const near = f.raiders.filter(r => r.alive && r.pos >= 0 && gateIdx - Math.floor(r.pos) <= RALLY.reach).sort((a, b) => b.pos - a.pos);
    for (const r of near) { if (dmg <= 0) break; const d = Math.min(dmg, r.hp); r.hp -= d; dmg -= d; log.rally += d; if (r.hp <= 0) { r.alive = false; log.kills.push(r.id); } }
  }
  if (f.rallyCooldown > 0) f.rallyCooldown--;

  // Turrets fire: target the raider furthest along the path within range.
  for (const t of Object.values(s.turrets)) {
    const cellI = s.turretCells[t.iid];
    if (cellI === undefined) continue;
    const cell = cellFromIndex(cellI);
    const cs = TURRET_COMBAT[t.def];
    for (let k = 0; k < cs.rate; k++) {
      if (t.ammo < C.AMMO_PER_SHOT) break;
      const target = f.raiders
        .filter(r => r.alive && r.pos >= 0 && !r.breached && chebyshev(cell, path[Math.min(gateIdx, Math.floor(r.pos))]!) <= cs.range)
        .sort((a, b) => b.pos - a.pos)[0];
      if (!target) break;
      t.ammo -= C.AMMO_PER_SHOT;
      target.hp -= cs.damage;
      log.shots.push({ turretIid: t.iid, targetId: target.id, damage: cs.damage });
      if (target.hp <= 0) { target.alive = false; log.kills.push(target.id); }
    }
  }

  // Raiders move / attack.
  for (const r of f.raiders) {
    if (!r.alive || r.pos < 0 || r.breached) continue;
    const def = RAIDERS[r.type];
    let budget = def.speed;
    while (budget > 0) {
      const at = Math.floor(r.pos);
      const nextI = path[Math.min(gateIdx, at + 1)]!;
      const barricade = at < gateIdx ? s.barricades.find(b => b.cell === cellIndex(nextI) && b.hp > 0) : undefined;
      if (barricade) {
        barricade.hp -= def.attack; log.barricadeHits += def.attack;
        if (barricade.hp <= 0) s.barricades = s.barricades.filter(b => b !== barricade);
        break;
      }
      if (at >= gateIdx) {
        if (f.wallHp > 0) { f.wallHp -= def.attack; log.wallHits += def.attack; break; }
        r.breached = true; log.breaches.push(r.id); break;
      }
      const step = Math.min(budget, 1);
      r.pos += step; budget -= step;
      if (r.pos > gateIdx) r.pos = gateIdx;
      if (budget > 0 && budget < 1 && rng() > budget) break; // fractional speed: probabilistic extra step
    }
  }

  f.last = log;

  const alive = f.raiders.some(r => r.alive && !r.breached);
  const spawning = f.raiders.some(r => r.alive && r.pos < 0);
  if (!alive && !spawning) finish(s, pr, rng);
  else if (f.tick >= MAX_TICKS) { for (const r of f.raiders) if (r.alive && !r.breached) { r.breached = true; log.breaches.push(r.id); } finish(s, pr, rng); }
}

function finish(s: State, pr: PendingRaid, rng: Rng): void {
  const f = pr.fight;
  const killed = f.raiders.filter(r => !r.alive).length;
  const breached = f.raiders.filter(r => r.breached).length;
  const repelled = breached === 0;
  const outcome: RaidOutcome = { repelled, killed, breached, ticks: f.tick, loss: null, drops: {}, gearDrop: null };

  if (repelled) {
    const scrap = Math.round(killed * DROPS.scrapPerKill * (1 + 0.25 * (pr.zoneTier - 1)));
    if (scrap > 0) { outcome.drops.iron_ore = Math.ceil(scrap / 2); outcome.drops.coal = Math.floor(scrap / 2); }
    if (rng() < DROPS.bonusChance) {
      const zone = ZONES[pr.zoneTier - 1]!;
      const open = STAT_IDS.filter(st => s.avatar.gear[st] < C.MAX_GEAR_TIER);
      if (GEAR_DROP_ZONES.has(zone.id) && open.length && rng() < 0.4) {
        outcome.gearDrop = pick(rng, open); s.avatar.gear[outcome.gearDrop]++;
      } else if (rng() < 0.5) outcome.drops.hardened_steel = 1;
      else outcome.drops[weightedPick(rng, PREMIUM_WEIGHTS)] = 1;
    }
    addBag(s.res, outcome.drops);
  } else {
    outcome.loss = applyLoss(s, pr.zoneTier, breached, rng);
  }
  f.done = outcome;
  const wave = waveDef(pr.zoneTier).groups.map(g => ({ type: g.type, count: g.count }));
  s.raidHistory.unshift({ at: pr.startedAt, zoneTier: pr.zoneTier, outcome, wave });
  if (s.raidHistory.length > C.RAID_HISTORY_KEEP) s.raidHistory.length = C.RAID_HISTORY_KEEP;
}

function applyLoss(s: State, tier: number, breached: number, rng: Rng): RaidOutcome['loss'] {
  const stealable = (['iron_ore', 'coal', 'stone'] as ResourceId[]).filter(id => s.res[id] > 0);
  const turretIds = Object.keys(s.turrets);
  const buildingIds = Object.keys(s.buildings);
  // More breachers → worse. One or two: they grab what they can carry. Three+: something gets wrecked.
  const wreck = breached >= 3 && rng() < 0.6;
  if (wreck && turretIds.length && rng() < 0.7) {
    const iid = pick(rng, turretIds); const def = s.turrets[iid]!.def;
    delete s.turrets[iid]; delete s.turretCells[iid];
    const idx = s.slots.findIndex(e => e && e.kind === 'turret' && e.iid === iid); if (idx >= 0) s.slots[idx] = null;
    removeConveyorsTouching(s, 'turret', iid);
    return { kind: 'turret', def };
  }
  if (wreck && buildingIds.length) {
    const iid = pick(rng, buildingIds); const def = BUILDINGS[s.buildings[iid]!.def].id;
    delete s.buildings[iid];
    const idx = s.slots.findIndex(e => e && e.kind === 'building' && e.iid === iid); if (idx >= 0) s.slots[idx] = null;
    removeConveyorsTouching(s, 'building', iid);
    return { kind: 'building', def };
  }
  if (stealable.length === 0) return null;
  const resource = pick(rng, stealable);
  const frac = Math.min(0.6, (C.RAID_STEAL_BASE + (tier - 1) * C.RAID_STEAL_PER_TIER) * Math.min(3, breached));
  const amount = Math.max(1, Math.floor(s.res[resource] * frac));
  s.res[resource] -= amount;
  return { kind: 'steal', resource, amount };
}

export const barricadeCost = () => BARRICADE;
export const rallyCost = () => RALLY;
export { TURRETS };
