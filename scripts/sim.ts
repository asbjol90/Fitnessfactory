/**
 * Rough economy sim: a steady player, 12 weeks. Prints weekly gold income and
 * how long the first turrets take. Run: npm run sim
 */
import { initialState, reduce, seededRng, type State, type Action } from '../src/engine';

const rng = seededRng(42);
const DAY = 86400000;
let now = new Date('2026-09-14T08:00:00').getTime();
let s: State = reduce(initialState(now), { type: 'pick_avatar', id: 'm1_worker', name: 'Sim' }, { now, rng }).state;
const act = (a: Action) => { const r = reduce(s, a, { now, rng }); if (!r.error) s = r.state; return r; };

const zones = ['outskirts', 'ridgeline', 'quarry', 'hollow', 'reach'];
let goldEarnedTotal = 0;
for (let week = 1; week <= 12; week++) {
  const goldStart = s.gold;
  for (let d = 0; d < 7; d++) {
    now += DAY;
    act({ type: 'tick' });
    for (const h of ['water', 'water', 'water', 'morning_water', 'balanced_meal', 'balanced_meal'] as const) act({ type: 'log_habit', habit: h });
    if (d < 5) { // weekday cardio 35 min in best accessible zone
      const lvl = Math.min(4, Math.floor(s.avatar.volume.speed / 500));
      act({ type: 'log_session', kind: 'cardio', minutes: 35, intensity: 'medium', zone: zones[Math.min(lvl, s.maxZoneTierReached === 0 ? 0 : lvl)]! });
    }
    if (d % 2 === 0) act({ type: 'log_session', kind: 'strength', minutes: 45, intensity: 'medium' });
    if (d % 3 === 0) act({ type: 'log_session', kind: 'flexibility', minutes: 30, intensity: 'medium' });
    // Build order
    if (!Object.values(s.buildings).some(b => b.def === 'furnace')) act({ type: 'build', building: 'furnace' });
    else if (!Object.values(s.buildings).some(b => b.def === 'crusher')) act({ type: 'build', building: 'crusher' });
    const furnace = Object.values(s.buildings).find(b => b.def === 'furnace');
    if (furnace) act({ type: 'produce', iid: furnace.iid, recipe: 'smelt', units: Math.max(1, Math.min(10, Math.floor(s.labor / 3), Math.floor(s.energy / 2), s.res.iron_ore)) });
    // Sell everything premium + surplus iron, keep 30 ore
    for (const r of ['silver', 'gold_ore', 'diamond'] as const) if (s.res[r] > 0 && s.labor > 5) act({ type: 'sell', resource: r, units: s.res[r] });
    if (s.res.iron > 20 && s.labor > 5) act({ type: 'sell', resource: 'iron', units: s.res.iron - 20 });
    if (s.res.stone > 40 && s.labor > 5) act({ type: 'sell', resource: 'stone', units: s.res.stone - 40 });
    // Claim contracts
    for (const c of s.contracts.slots) act({ type: 'claim_contract', id: c.id });
    // Turrets when affordable
    if (Object.keys(s.turrets).length < 2 && s.res.iron_ore >= 40) act({ type: 'build_turret', turret: 'scrap_launcher' });
    if (Object.keys(s.turrets).length < 3 && s.gold >= 60 && s.res.iron >= 15) act({ type: 'build_turret', turret: 'shotgun' });
    for (const t of Object.values(s.turrets)) if (t.ammo < 40) act({ type: 'load_ammo', iid: t.iid });
  }
  const earned = s.gold - goldStart;
  goldEarnedTotal += Math.max(0, earned);
  console.log(`wk${String(week).padStart(2)}  gold ${String(s.gold).padStart(4)} (Δ${String(earned).padStart(4)})  labor ${String(s.labor).padStart(4)} energy ${String(s.energy).padStart(3)}  ore ${s.res.iron_ore} iron ${s.res.iron}  speedVol ${s.avatar.volume.speed}  turrets ${Object.keys(s.turrets).length}  raids ${s.raidHistory.length} repelled ${s.raidHistory.filter(r => r.repelled).length}  maxZone ${s.maxZoneTierReached}`);
}
