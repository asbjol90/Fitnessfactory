# Fitness Factory 1.0

Real training → in-game resources → a factory economy → deeper loot zones and raids.
This is the 1.0 rebuild of the v1 single-file game. Mechanics and numbers follow
`docs/design-reference-v1.md` unless a constant is marked `1.0 CHANGE` or `1.0 ASSUMPTION`
in `src/engine/constants.ts`.

## Layout

```
src/app/               UI: store (dispatch → engine → persist → re-render), screens, sheets
src/art/               SVG art: factory nodes, resource icons, layered avatar
src/engine/            pure game logic, zero DOM — everything is testable
  constants.ts         every tunable number
  data/                static content: resources, zones, techs, buildings, turrets, contracts
  state.ts             save shape + helpers (bags, dates, seeded RNG)
  derive.ts            read-only selectors: levels, multipliers, gates, capacity
  game.ts              reduce(state, action, ctx) → { state, events, error }
  tick.ts              time passage: drain, solar, belts, weekly reset
  production.ts        recipes (strict for buttons, lenient for belts)
  raids.ts             10-tick raid recap, losses
  contracts.ts         weekly roll, progress, payout
  __tests__/           vitest — the balance rules from the design doc, pinned
scripts/sim.ts         12-week economy sim of a steady player (npm run sim)
scripts/seed.ts        mid-game save for manual testing (npm run seed > save.json)
public/                PWA manifest, icons, service worker
```

The UI only ever calls `reduce`. It never touches state directly. Events returned by
`reduce` are what the UI animates (loot drops, raids, level-ups, belt flow).

## Commands

```
npm install
npm run dev       # local dev server
npm test          # engine tests
npm run sim       # economy sim
npm run build     # type-check + production build to dist/
```

## Save data

Key `fitnessfactory_state_v2` in localStorage. A v1 save (`fitnessfactory_state_v1`) found on
first launch is migrated automatically (resources, buildings, upgrades, slots, turrets + ammo,
belts, techs, infrastructure, gear, stats, history). Current-week contract progress and old raid
records are not carried over. Backup/restore lives in Lab → Settings.

## Deploy

Push to `main`. The workflow in `.github/workflows/pages.yml` runs the tests, builds, and
publishes `dist/` to GitHub Pages. In the repo settings, set Pages → Source to "GitHub Actions"
once. Vite's `base` is `/Fitnessfactory/`; change it if the repo is renamed.

## What changed from v1 (mechanics)

Everything else is 1:1 with the shipped v1 `index.html`.

- Session minutes counted for rewards are capped by intensity: hard 90, medium 120, light 180 (`C.MINUTE_CAP`). Real minutes are still logged.
- Belts have an explicit source node (Stockpile or a building) as well as a target; v1 belts only had a target. Migrated belts get Stockpile as source.
- Weekly contracts are drawn at random from the eligible pool instead of by week number, so two players in the same week see different offers.
- Building-gated contract amounts (e.g. "Refine 3 Silver") are new numbers; v1's doc only gave the reward range.
- The raid recap is animated on the Factory floor; the raid log keeps the last 20 and is browsable.
- Nutrition, loot split, premium/research/steel drop chances and starting Energy follow the v1 source (the design doc had simplified or omitted them).

## Round 1 (Sept 2026) — mechanics after the first play test

- Munitions Press (main floor): Cartridges (Assault Rifle) and Hardened Rounds (Minigun); its Heavy Press upgrade adds Alloy Rounds (Double Minigun). Turret ammo is now Iron Ore → Iron → Cartridges → Hardened Rounds → Alloy Rounds. Default ammo load 10.
- Foundry can Temper Steel (5 Iron + 3 Coke → 1 Hardened Steel), so alloy is no longer capped by rare loot.
- Machine Shop is the gateway to the workshop: every other workshop building costs 1–3 Precision Components. Workshop building Gold +25%, Minigun/Double Minigun Gold +30%, factory size 3/4 Gold +40%, top two gear tiers cost more.
- Solar panels moved to the roof: no slot, capped at 1/2/3/4 by factory size.
- Crusher paths rebalanced: Hydraulic is Labor-free, Sifting costs 2 Labor with the ore bonus.
- Buildings can be duplicated ("Furnace 2").
- Stockpile and Trader have sheets listing their belts (removable). Production shows the output in stock, floats the gain, and vibrates on phones.
- Raid notice uses the new text, auto-plays once, and clears with "Got it". Settings (backup, full reset) moved to the gear icon in the top bar. Trading Post split into Market / Contracts with grouped selling and a raw-surplus button.
- Save version 3; v2 saves upgrade in place.

## Chunk A (Sept 2026) — factory floor visuals

- Floor environment: concrete interior with lamps, rampart strip, brick wall with crenellations and a gate where the shipping lane exits, dirt outside. Nodes sit on raised plates with shadows; empty slots are painted floor markings.
- Conveyors have rails, a roller bed and moving chevrons; items ride the belt with shadows; item count scales with the belt's amount.
- Stockpile is a rack whose crates fill with total stock and shows the top three resources with counts.
- Long-press any building or turret card (build sheet or on the floor) for the full picture: recipes, paths, what feeds it, what it feeds, build requirements, and for turrets how many are needed per zone.
- Tapping the Trader opens the Trading Post.
- Extra weekly contract slots can be bought for 25 / 40 / 60 Gold (resets Monday).
- Palette pass: warm charcoal base and desaturated accents app-wide (tokens in `styles.css`); floor lighting is grime and small lamp pools instead of light cones. Stockpile is double width with five resource counters.
- Factory dressing: overhead pipe run with valve and brackets, two slowly turning gear clusters, hazard-striped shipping lane and loading bay. Stockpile sheet grouped by tier with totals, value, and a Sell shortcut.

## Belts & hauling (Sept 2026)

- Belts come in three tiers: 3 / 5 / 10 units per day. Laying is free (tier 1); upgrade per belt from the machine's sheet — tier 2 costs 6 Iron + 4 Gravel, tier 3 costs 10 Iron + 2 Precision Components + 15 Gold. Tier shows on the floor (second rail, hazard edge).
- Hauling: a machine pays 1 Labor per 4 units moved in or out for any resource that has no belt. Belt the input in and the output onward and production is hauling-free. Conveyor runs count too.
- Bought contract slots now cost 10 / 15 / 20; deliver-contracts pay at least 1.5× the goods' sell value.
- Natural stat levels 3–5 take more volume (speed/energy 600 / 1400 / 3000 minutes; strength 450 / 1100 / 2400 Labor; research 200 / 500 / 1000).
- Logging a session vibrates and floats the result over the button.
- Save version 4.

## Chunk B — raids as tower defence (Sept 2026)

- A raid no longer resolves instantly. After a loot run it can leave raiders *at the gate*; loot runs are blocked until you fight them on the new **Defence** tab.
- The field is a 7×6 grid outside the wall. The wall tier shapes the road: Palisade (straight), Stone Wall (one bend, gate 12 HP, 2 barricades), Reinforced Wall (switchback, gate 30 HP, 3 barricades). Upgrading clears barricades and anything standing on the new road.
- Turrets are bought on the Factory wall and positioned on the field. Combat stats: range (cells, any direction), damage, shots per tick; every shot costs 2 ammo. Turrets fire at whoever is furthest along the road within range. Scrap Launcher 2/3×1, Shotgun 1/10×1, Assault Rifle 3/7×1, Minigun 2/5×2, Double Minigun 2/8×2.
- Three raider types: Scrapper (1 cell/tick), Runner (2), Brute (½, hits gates and barricades for 3). Waves per zone tier are in `data/defence.ts`, tuned with `npm run defsim` so that 3 turrets of the previous tier hold a zone on a Palisade ~80–90% of the time and 2 of the current tier hold it outright.
- Barricades: 8 Labor + 4 Stone, 15 HP, on the road at least two cells from the gate; raiders must break them.
- Rally: during the fight, 12 Labor sends your workers to the gate for one tick (12 damage within 1 cell), 2-tick cooldown.
- Repelled raids drop scrap (Iron Ore/Coal per kill) with a 10% roll for Hardened Steel, a premium, or in Hollow/Reach a gear tier. Breaches steal raw materials; three or more breachers can wreck a turret or building.
- The fight is deterministic per raid seed and advances one tick per action, so it survives closing the app mid-fight.
- Save version 5; old raid records are dropped.

### Hotfix: ammo economy (Sept 2026)
- Ammo per shot 2 → 1; the balance sim had assumed full magazines, so real raids ran turrets dry in five ticks. Press yields raised: Cartridges 6, Hardened Rounds 6, Alloy Rounds 8 per run. "Fill" button on turrets (Factory wall and Defence roster).
- Raid chance per run 20% → 15%. Repelled raids drop more scrap (1.5 per kill) and roll a bonus 15% of the time.
- `npm run defsim` now simulates with 40 ammo per turret (`AMMO=… npm run defsim` to change).

### Batch: ammo, backlog, smoother fights (Sept 2026)
- Press yields doubled again: Cartridges 12, Hardened Rounds 12, Alloy Rounds 16 per run.
- Tap a belt on the factory floor → belt sheet (tier, capacity, upgrade, remove); belts have a wide tap area. Tap the wall band → wall sheet. The wall card on Defence stays visible during a pending raid (upgrade locked).
- Fight rendering is patched in place between ticks, so raiders glide along the road, HP bars shrink smoothly, turrets swing continuously, and kills fade with a puff instead of the whole field redrawing.
- Breach consequences escalate: each breacher grabs a cut of a raw pile (more breachers → more piles, bigger cuts); 2+ tear down your barricades; 3+ wreck a turret (or a building if you have none); 5+ wreck a building as well.

## Machine art pass (Sept 2026)
- All 12 machines and 7 upgrade variants redrawn (`src/art/machines.ts`) for silhouette recognition: real-world referents, one colour accent each. Armory renamed Gearsmith (id unchanged).
- Each machine has one signature motion plus at most one breathing colour (`src/art/machines.css`). Three states drive the floor: **starved** (no Energy, or no recipe has its inputs in stock — everything stops, glow flickers, red lamp), **run** (produced something today, by belt or by hand — full motion), **idle** (default — slow motion, no emitters). `machineState()` in `derive.ts`.
- Production burst: on Make, the machine flashes a ring and slides its product out, both on the floor node and in the sheet header, so it's visible without a finger over it.
- Save version 6 (`lastRunDay` per building).
