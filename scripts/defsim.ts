/**
 * Defence balance sim. For each zone tier: N turrets of a given tier, greedily
 * placed on the cells that see the most road, full ammo, on each wall tier.
 * Prints repel rate over 40 seeds. Run: npm run defsim
 */
import { BARRICADE, C, GRID_COLS, ZONES, wallDef, GRID_ROWS, TURRET_COMBAT, TURRET_IDS, cellFromIndex, cellIndex, inRange, initialState, pathOf, placeable, reduce, seededRng, type State, type TurretId } from '../src/engine';

const T0 = Date.now();
const AMMO = Number(process.env.AMMO ?? 120);
const BARRICADES = process.env.BARRICADES !== '0';
function setup(turret: TurretId, n: number, wall: 1 | 2 | 3, zone: number): State {
  let s = initialState(T0);
  s = reduce(s, { type: 'pick_avatar', id: 'm1_worker', name: 'sim' }, { now: T0, rng: Math.random }).state;
  s = { ...s, wall, lootRunsCompleted: 20, maxZoneTierReached: zone, labor: 0, avatar: { ...s.avatar, volume: { ...s.avatar.volume, speed: 3000 } } };
  // Best cells: most road cells within range, ties broken toward the gate end of the road.
  const road = pathOf(s);
  const cells = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => i).filter(i => placeable(s, i));
  const score = (i: number) => { const c = cellFromIndex(i); const r = TURRET_COMBAT[turret].range; return road.reduce((a, p, idx) => a + (inRange(c, p, r) ? 1 + idx / 100 : 0), 0); };
  cells.sort((a, b) => score(b) - score(a));
  for (let k = 0; k < n; k++) {
    const iid = `t${k}`;
    s.turrets[iid] = { iid, def: turret, ammo: AMMO };
    s.turretCells[iid] = cells[k]!;
  }
  if (BARRICADES) { // max barricades, on the road cells nearest the gate that are allowed
    const road = pathOf(s); const allowed = wallDef(s.wall).barricades;
    for (let k = road.length - 3, n = 0; k >= 0 && n < allowed; k -= 2, n++) s.barricades.push({ cell: cellIndex(road[k]!), hp: BARRICADE.hp });
  }
  return s;
}
function fight(s: State, seed: number): boolean {
  const rng = seededRng(seed);
  const zoneId = ZONES[s.maxZoneTierReached - 1]!.id;
  let st: State = { ...s, pendingRaid: null };
  for (let i = 0; i < 300 && !st.pendingRaid; i++) st = reduce(st, { type: 'log_session', kind: 'cardio', minutes: 20, intensity: 'medium', zone: zoneId }, { now: T0 + i, rng }).state;
  if (!st.pendingRaid) return false;
  let guard = 0;
  while (st.pendingRaid && !st.pendingRaid.fight.done && guard++ < 200) st = reduce(st, { type: 'raid_tick', rally: false }, { now: T0, rng }).state;
  return !!st.pendingRaid?.fight.done?.repelled;
}
const SEEDS = 24;
console.log('zone  wall | ' + TURRET_IDS.map(t => t.padEnd(14)).join('| '));
for (let zone = 1; zone <= 5; zone++) {
  for (const wall of [1, 2, 3] as const) {
    const row: string[] = [];
    for (const turret of TURRET_IDS) {
      const rates: string[] = [];
      for (const n of [2, 3, 4]) {
        let wins = 0;
        for (let seed = 1; seed <= SEEDS; seed++) if (fight(setup(turret, n, wall, zone), seed)) wins++;
        rates.push(`${String(Math.round(100 * wins / SEEDS)).padStart(3)}`);
      }
      row.push(rates.join('/'));
    }
    console.log(`  ${zone}     ${wall}  | ${row.map(x => x.padEnd(14)).join('| ')}`);
  }
}
console.log(`(cells: repel % with 2/3/4 turrets of that type, ${AMMO} ammo each, ${BARRICADES ? 'max barricades' : 'no barricades'}, no rally)`);
