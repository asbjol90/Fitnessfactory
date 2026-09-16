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
