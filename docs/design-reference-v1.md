# Fitness Factory — Design Reference

Purpose of this document: a complete, numbers-exact snapshot of the game as built, for rebuilding with new graphics/tooling while keeping all mechanics and balance identical. Everything below is pulled directly from the working `index.html`, not from memory.

The game is a single-file HTML/JS PWA. Real training (cardio, strength, flexibility, nutrition habits) generates in-game resources, which power a factory-building economy, which unlocks deeper loot zones with raid risk, defended by turrets. See the attached flowchart for the loop shape; this document has the exact numbers.

---

## 1. Core Loop

1. Log a real training session (Cardio / Strength / Flexibility) or a Nutrition habit.
2. Cardio → **Loot** (raw/premium resources, zone-gated). Strength → **Labor**. Flexibility → **Energy**. Nutrition → **Research**.
3. Labor + Energy + raw materials power **Buildings** that refine raw → goods, on the **Factory Floor**.
4. Goods get sold (manually or via **Conveyors**) for **Gold**, or fulfill weekly **Contracts** for Gold.
5. Gold + goods fund bigger buildings, **Factory Size** upgrades, **Turrets**, and **Avatar gear**.
6. Speed (from Cardio volume) unlocks deeper **Zones** with better loot multipliers — and after enough loot runs, **Raid** risk, which turrets must repel or you lose something.
7. Loop compounds: better gear/turrets/factory → safer, more profitable runs → afford more of the same.

---

## 2. Resources

| Resource | Tier | Sell price |
|---|---|---|
| Iron Ore, Coal, Stone | Raw | 1 each |
| Silver | Premium | 5 |
| Gold Ore | Premium | 8 |
| Diamond | Premium | 20 |
| Hardened Steel | Rare | 35 |
| Iron | Refined | 4 |
| Gravel | Refined | 3 |
| Coke | Refined | 4 |
| Coal Tar | Refined | 6 |
| Refined Silver | Refined | 12 |
| Gold Bullion | Refined | 20 |
| Precision Components | Refined | 25 |
| Cut Diamond | Refined | 45 |
| Refined Catalyst | Refined | 40 |
| Reinforced Alloy | Refined | 60 |
| Master Jewelry | Refined | 160 |
| Masterwork Gear | Refined | 220 |
| Research | Special | not sellable |

Buyable resources (always a bad deal — 5× sell price): Iron Ore, Coal, Stone, Iron, Gravel, Coke. Premium-derived refined goods stay loot-exclusive, can't be bought.

---

## 3. Economy Constants (all FIRST DRAFT / tunable)

- `LOOT_K = 0.15`, duration exponent `1.2` (longer sessions pay off disproportionately more)
- `LABOR_K = 0.8`, `ENERGY_K = 0.7`
- `BASE_DAILY_DRAIN = 2` (passive Energy drain/day, before buildings' own upkeep)
- Selling costs 1 Labor per sale unless the `basic_logistics` tech is unlocked (free after)
- `BUY_PRICE_MULT = 5`
- Demolish: 80% of build cost refunded as Gold, costs 1 Labor, no native confirm dialogs (custom two-tap confirm in UI)
- Emergency Energy quota: 40 Gold first use/week, +25 Gold each additional use that week, grants 20 Energy (a stopgap, not a full refill), resets weekly

---

## 4. Buildings

### Furnace (special-cased, not in the generic building system)
- Build: 15 Stone, 10 Iron Ore, 20 Labor
- Base recipe: Iron Ore → Iron, cost 3 Labor + 2 Energy per unit
- Branching upgrade (permanent, mutually exclusive), unlocked once base Furnace exists:
  - **Blast Furnace**: cost 15 Iron + 30 Gold. Recipe becomes 1 Labor + 3 Energy/unit. Daily drain 4 (power-hungry even idle). Best for Flexibility-leaning players.
  - **Forge Works**: cost 15 Iron + 30 Gold. Recipe becomes 3 Labor + 1 Energy/unit. Daily drain 1. Best for Strength-leaning players.

### Main Floor
| Building | Build cost | Base drain | Recipe(s) |
|---|---|---|---|
| Crusher | 20 Stone, 15 Labor | 1 | Stone→Gravel, 2 Labor + 1 Energy |
| Coke Oven | 15 Stone, 10 Coal, 15 Labor | 2 | Coal→Coke, 2 Labor + 3 Energy |

**Crusher upgrades** (branching, pick one):
- Hydraulic Crusher: 8 Gravel + 15 Gold → recipe becomes 1 Labor + 1 Energy, drain 2.
- Sifting Crusher: 8 Gravel + 15 Gold → same recipe cost, drain 1, 15% chance of bonus Iron Ore per unit.

**Coke Oven upgrades** (branching, pick one):
- Industrial Coker: 10 Coke + 25 Gold → recipe becomes 1 Labor + 3 Energy, drain 4.
- Byproduct Coker: 10 Coke + 25 Gold → same recipe cost, drain 2, 25% chance of bonus Coal Tar (only source of Coal Tar; required for Chemical Works).

### Workshop Floor
Requires 2 Main Floor buildings OR 3 completed Contracts to unlock the floor. Individual buildings (except Chemical Works and Solar Panel) additionally require the Electrical Grid + Business License infrastructure.

| Building | Gate | Build cost | Drain | Recipe(s) |
|---|---|---|---|---|
| Chemical Works | Byproduct Coker upgrade | 15 Coal Tar, 10 Iron, 35 Gold | 2 | Coal Tar×3 → Refined Catalyst, 4 Labor + 5 Energy |
| Refinery | Grid+License | 15 Iron, 10 Gravel, 40 Gold | 3 | Silver→Refined Silver (4L+3E); Gold Ore→Gold Bullion (5L+4E) |
| Lapidary | Grid+License | 20 Iron, 15 Coke, 5 Hardened Steel, 60 Gold | 2 | Diamond→Cut Diamond, 8 Labor + 6 Energy |
| Foundry | Grid+License | 25 Iron, 15 Coke, 30 Gold | 3 | Iron×3+Coke×2+Hardened Steel×1 → Reinforced Alloy, 10L+8E |
| Machine Shop | Grid+License | 15 Iron, 10 Coke, 25 Gold | 3 | Iron×2+Coke×1+Gravel×2 → Precision Components, 6L+4E |
| Jeweler | Grid+License | 5 Gold Bullion, 5 Refined Silver, 60 Gold | 3 | Cut Diamond×1+Gold Bullion×2+Refined Silver×2 → Master Jewelry, 12L+8E |
| Armory | Grid+License | 2 Reinforced Alloy, 10 Iron, 90 Gold | 4 | Two recipes → Masterwork Gear: (Reinforced Alloy×2+Cut Diamond×1, 15L+12E) or (Reinforced Alloy×2+Refined Catalyst×1, 14L+10E) |
| Solar Panel | Reinforced Roof infrastructure | 10 Iron, 20 Gold, 15 Research | 0 | No recipe — passive +3 Energy/day |

### Infrastructure (one-time unlocks, shared across buildings)
- Reinforced Roof: 60 Gold, 15 Iron — required for Solar Panel.
- Upgraded Electrical Grid: 120 Gold, 30 Iron, 15 Coke — required for most Workshop buildings.
- Business License: 150 Gold — required for most Workshop buildings.

---

## 5. Factory Floor, Slots & Conveyors

- Open slot grid, not fixed rows — every building/turret occupies a numbered slot (`state.factorySlots[]`), freely rearrangeable via an **Arrange** mode (click a slot, click another, they swap).
- A **Connect** mode (needs the Conveyor Systems tech) lets you click two nodes to lay a belt between them instead.
- **Factory Size levels** (interior slots / wall slots / upgrade cost):
  1. 4 interior / 2 wall (starting, free)
  2. 7 interior / 3 wall — 150 Gold, 30 Iron, 20 Gravel
  3. 10 interior / 4 wall — 350 Gold, 60 Iron, 30 Coke
  4. 12 interior / 5 wall — 600 Gold, 100 Iron, 60 Coke, 5 Gold Bullion
- Wall slots are visually separated by a "WALL" divider line **below** the wall slots (wall slots read as inside/defending the boundary; Trader sits outside it). Regular buildings can overflow into wall slots when interior is full; turrets can *only* go in wall slots.
- Moving anything (building or turret) to a new slot automatically removes any conveyor feeding it — avoids silently stale or misdirected belts. This is deliberate friction even for buildings, whose conveyors would otherwise have kept working fine (they're addressed by ID, not slot) — chosen for consistency over explaining two different rules.
- **Conveyors**: each belt carries exactly one named resource, one direction, with a configurable "amount per day" (default 5, `DEFAULT_CONVEYOR_AMOUNT`). Connecting to a building auto-triggers that many units of its recipe per day (capped by actual affordable Labor/Energy/materials that day — never invents resources). Connecting to Trader auto-sells that many units/day. Connecting to a turret slot fills that turret's local ammo buffer, and is rejected/flagged if the turret in that slot no longer matches the belt's resource (e.g. after a turret swap).
- Belt lines render as simple curves with endpoint dots marking true connections — deliberately not routed to avoid ever crossing a box, since the dots already disambiguate a coincidental visual overlap from a real connection.

---

## 6. Avatar System

- 4 stats, each with 5 levels (level 1 = ×1.0 multiplier, level 5 = ×1.4), driven by cumulative real training volume:
  - **Speed** (cumulative Cardio minutes): 0/180/500/1000/2000 min thresholds → loot yield + zone access
  - **Strength** (cumulative Labor *spent*, not earned): 0/150/400/900/1800 → Labor generation
  - **Energy** (cumulative Flexibility minutes): 0/180/500/1000/2000 → Energy generation
  - **Research** (cumulative Research *earned*): 0/50/150/350/700 → Research gain
- **Gear tiers**, 0–4 per category, each tier = +1 effective level on top of the natural level above (capped at level 5 total):

| Category | Gear name | Crafted from | Tier costs (1→4) |
|---|---|---|---|
| Speed/Loot | Field Armor | Reinforced Alloy | 2 / 5 / 9 / 14 |
| Strength/Labor | Work Tools | Precision Components | 2 / 5 / 9 / 14 |
| Energy | Power Cells | Refined Catalyst | 2 / 5 / 9 / 14 |
| Research | Scholar's Kit | Master Jewelry | 1 / 3 / 6 / 10 |

- A rare direct gear-drop from looting also exists (see §7), independent of crafting.

### Avatar art — current plan (after two failed layering attempts)
True modular layering (separate transparent armor/tools/power/scholar/coat/head pieces stacking on a base body) was attempted twice and failed both times on export/tooling grounds — not a design flaw, a production one. **Current agreed direction: fully pre-composed character art, one flat image per combination, not runtime layering.**
- 8 base characters: `m1_worker, m2_soldier, m3_scavenger, m4_scholar, f1_worker, f2_soldier, f3_scavenger, f4_scholar` (4 male, 4 female — picking one *is* the identity choice, no separate head-swap layer).
- Each character gets **5 pre-drawn "gear stage" images** (stage 0 = bare, stage 4 = fully decked out), collapsing the 4 independent gear-tier stats into one overall visual stage (e.g. rounded average of the 4 tiers) — full 4-axis combinatorics (625 per avatar) is not producible by hand, this was a deliberate scope cut to make the art tractable.
- **40 total images** (8 × 5). Exact numeric stats stay precise and visible elsewhere (Avatar tab); the art's job is to feel like progression, not be a literal stat readout.
- Delivery spec that avoided every prior failure mode: single flat finished illustration per file (never a contact sheet/crop), background either genuinely transparent or a **solid fill exactly matching the app's panel color `#132234`** (sidesteps needing perfect alpha entirely — was the root cause of two failed packs). File naming: `<avatar_id>_stage<0-4>.png`, organized in `male/` and `female/` folders.
- Optional future stretch (not started): theme each avatar's look around whichever single stat is currently highest, so a Speed-build and a Research-build character diverge visually. Real added complexity — only worth it if the flat version feels too plain in practice.

---

## 7. Loot Mechanics

- Zone-gated RNG loot on Cardio sessions, non-linear scaling with duration (exponent 1.2), Speed level, and zone multiplier.
- Rare Hardened Steel drop: chance = `min(0.07, 0.0009 × duration_min × zone.lootMult)` (7% hard cap). Pity mechanic: guaranteed after `PITY_THRESHOLD = 15` consecutive successful loot runs with none.
- Rare direct gear-tier drop (independent of crafting): only in Deep Hollow / Ashen Reach zones, chance = `min(0.005, 0.00003 × duration_min × zone.lootMult)` (0.5% hard cap), only rolls for gear categories not yet maxed.
- Failed zone attempts (venturing beyond your Speed level): salvage chance = `0.28` at 1 level short, decaying `0.07` per additional level short.

---

## 8. Zones

| Zone | Required Speed level | Loot multiplier |
|---|---|---|
| Trailhead Outskirts | 0 | 1.0× |
| Overgrown Ridgeline | 1 | 1.3× |
| The Fractured Quarry | 2 | 1.7× |
| Deep Hollow | 3 | 2.2× |
| The Ashen Reach | 4 | 2.8× |

---

## 9. Research Tech Tree

| Tier | Tech | Requires | Cost | Effect |
|---|---|---|---|---|
| 1 | Conveyor Systems | — | 15 Research | Unlocks conveyor belts |
| 1 | Basic Metallurgy | — | 10 Research | +8% loot yield |
| 1 | Basic Logistics | — | 10 Research | Selling no longer costs Labor |
| 1 | Field Training | — | 12 Research | +8% Labor generation |
| 2 | Advanced Metallurgy | Basic Metallurgy | 25 Research | +12% loot yield (stacks) |
| 2 | Trade Network | Basic Logistics | 25 Research | +12% Gold from selling |
| 2 | Endurance Training | Field Training | 25 Research | 3rd weekly Contract slot |
| 3 | Industrial Synthesis | Advanced Metallurgy + Trade Network | 50 Research | +15% Energy generation |

---

## 10. Contracts

Weekly, 2 slots (3 with Endurance Training tech). Pool of 24, gated by what's actually built/unlocked:
- **Always available (9)**: deliver Iron Ore ×20 (15g), refine Iron ×8 (18g), Labor 60/week (15g), Energy 40/week (15g), stockpile Iron Ore ≥30 (18g), stockpile Energy ≥35 (18g), find 1 Premium resource (20g), venture Ridgeline-or-deeper ×2 (20g), deliver Gravel ×15 (16g).
- **Building-gated (7)**: one per Workshop building (Refinery ×2 recipes, Lapidary, Machine Shop, Jeweler, Foundry, Armory, Chemical Works), rewards 20–35 Gold.
- **Zone-gated (3)**: venture Quarry-or-deeper ×2 (24g), Hollow-or-deeper ×2 (30g), Reach ×1 (35g).
- **Upgrade-gated (3)**: Blast Furnace energy push 70/week (26g), Forge Works labor push 90/week (26g), Coal Tar delivery ×10 (18g, needs Byproduct Coker).
- **Research-gated (1)**: sell Iron ×15 (20g, needs Trade Network).

---

## 11. Turrets

Wall-slot only, many instances allowed (unlike singleton buildings) — each placed turret has its own independent ammo buffer. A raid lasts a fixed 10 ticks (`RAID_APPROACH_TICKS`); no turret can ever fire more than 10 times in one raid regardless of tier, which is why the top two tiers lean on damage rather than fire rate.

| Turret | Shots/raid | Damage | Output (dmg×shots) | Ammo | Ammo cap | Build cost |
|---|---|---|---|---|---|---|
| Scrap Launcher | 2 | 4 | 8 | Iron Ore | 200 | 20 Iron Ore, 15 Labor |
| Shotgun | 2 | 8 | 16 | Iron | 200 | 15 Iron, 20 Gold |
| Assault Rifle | 8 | 5 | 40 | Coke | 200 | 15 Coke, 10 Iron, 35 Gold |
| Minigun | 10 | 8 | 80 | Precision Components | 200 | 5 Precision Components, 60 Gold |
| Double Minigun | 10 | 15 | 150 | Reinforced Alloy | 200 | 3 Reinforced Alloy, 100 Gold |

- Ammo cost: **2 ammo per shot** (`AMMO_PER_SHOT`).
- Manual "Load Ammo" button adds 20 ammo per click (`AMMO_LOAD_AMOUNT`), capped at 200. Conveyors can also auto-feed a turret's specific ammo resource.
- Gun personality, as designed: Scrap Launcher and Shotgun are both deliberately slow-firing (2 shots) — Shotgun's extra output comes purely from bigger payload, not speed. Assault Rifle trades some per-shot damage for much higher fire rate. Minigun and Double Minigun both sit at the 10-shot ceiling, so Double Minigun's edge over Minigun is pure damage, not rate of fire.

---

## 12. Raids

- Trigger: after a **successful** (non-failed) loot run. First `RAID_GRACE_RUNS = 5` successful loot runs are always safe, no exceptions. After that, `RAID_CHANCE = 0.2` (20%) per qualifying run — roughly 1 raid/week at 5 cardio sessions/week.
- Difficulty scales with `state.maxZoneTierReached` (the deepest zone tier ever successfully looted in — never decreases).
- **Wave table**, tuned so exactly 3 of a given turret tier clears one zone tier up, 2 always falls short:

| Zone tier | Raiders | HP each | Total wave HP | vs. 2× previous turret | vs. 3× previous turret |
|---|---|---|---|---|---|
| 1 (Outskirts) | 2 | 2 | 4 | — | — |
| 2 (Ridgeline) | 3 | 6 | 18 | 16 (short) | 24 (clears) |
| 3 (Quarry) | 5 | 8 | 40 | 32 (short) | 48 (clears) |
| 4 (Hollow) | 10 | 10 | 100 | 80 (short) | 120 (clears) |
| 5 (Reach) | 10 | 20 | 200 | 160 (short) | 240 (clears) |

- Resolution is **tick-based, resolved instantly** (a "recap" pattern, not live simulation) — each of up to 10 ticks, every turret with remaining shots and ≥2 ammo fires simultaneously, consuming ammo, until the wave's total HP hits 0 or ticks run out.
- If not repelled, one of three consequences (roughly 50% / 35% / 15% odds, re-rolling into the resource-steal branch if the chosen category has nothing to target):
  1. Steal `15% + zoneTierIndex×8%` of a random raw resource (Iron Ore/Coal/Stone) stockpile.
  2. Destroy a random built turret (no refund) — also cleans up any conveyor that was feeding it.
  3. Destroy a random non-turret building (no refund) — also cleans up its conveyors.
- **Reveal is deliberately deferred and separated from resolution**: the Log Session feedback only teases "something happened back at the base — check the Factory," with no outcome revealed. The actual result shows in a dedicated **Raid box** on the Factory Floor diagram (positioned beside Trader, since raiders are conceptually "outside" the wall same as the market) — dashed grey ("None yet"/"Quiet" if nothing happened *this* run) vs. solid green ("Repelled") or red ("Breach!"). This box is presently a plain colored placeholder; it's the intended seam for a future animated recap once raider/combat art exists. A raid report line below the diagram spells out exact numbers (raiders, HP, zone, what was lost) — and correctly distinguishes a fresh result from stale history (checked against `state.lootRunsCompleted` at the time of the raid), so a quiet run never shows old news as if it just happened.

---

## 13. Technical Notes for a Rebuild

- Currently a single self-contained `index.html` (HTML/JS/CSS, no build step), state persisted to `localStorage` under key `fitnessfactory_state_v1`.
- All artwork is embedded as base64 data URIs directly in the JS (`const STICKER_X = 'data:image/gif;base64,...'`), keyed by building/turret id in lookup objects (`NODE_STICKERS`, `TURRET_STICKERS`). This is what let the file grow past 1.2MB with the full machine/turret animation set — expected and fine for a single-file PWA, but worth knowing if a new build considers separate asset files instead.
- The Factory Floor is one SVG diagram, entirely regenerated on every render — slot positions computed from a fixed grid formula (4 columns interior, wall row below a dashed "WALL" divider), not stored per-slot.
- All numeric constants across every system above are explicitly commented in the source as "FIRST DRAFT" where they haven't been playtested — most have not been stress-tested beyond the specific feedback that shaped the values shown here (e.g. raid frequency was tuned twice already, turret build costs have not been touched at all since first written).

---

## 14. Open Backlog (not yet done, independent of the graphics rebuild)

- Conveyor-fed turret ammo exists but turret build costs vs. actual gold income pace have never been verified.
- Raid history (`state.raidHistory`, last 20 kept) has no browsing UI — only the most recent raid is ever shown.
- The animated raid recap (replacing the placeholder box) and remaining avatar-stat-theming stretch goal are both explicitly deferred, not scoped yet.
