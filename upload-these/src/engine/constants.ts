/**
 * Every tunable number in the game. Values are copied 1:1 from the v1 design
 * reference unless marked `// 1.0 CHANGE` with a reason.
 *
 * Formulas the v1 doc did not spell out (loot distribution, research per
 * nutrition log, etc.) are marked `// 1.0 ASSUMPTION` — they are our best
 * reconstruction, and the first candidates for a balance pass.
 */
export const C = {
  // --- Training → resources ---------------------------------------------
  LOOT_K: 0.15,
  LOOT_DURATION_EXP: 1.2,
  LABOR_K: 0.8,
  ENERGY_K: 0.7,
  /** Session intensity multiplier on loot/labor/energy (from v1 source). */
  INTENSITY_MULT: { light: 0.9, medium: 1.0, hard: 1.15 } as const,
  /**
   * 1.0 CHANGE: minutes counted per session are capped by intensity. Real
   * minutes are still logged; rewards use the capped value. Reason: few people
   * train hard for 90+ min, and the 1.2 exponent rewards padding the number.
   */
  MINUTE_CAP: { light: 180, medium: 120, hard: 90 } as const,
  MINUTE_MIN: 5,
  /** Raw loot split ore/coal/stone, jittered ×(0.7..1.3) per run (from v1 source). */
  RAW_WEIGHTS: [0.45, 0.30, 0.25] as const,
  RAW_JITTER: 0.6,
  /** At most one premium find per run. */
  PREMIUM_K: 0.004,
  PREMIUM_CAP: 0.35,
  /** Research found while looting: 1–2 units. */
  RESEARCH_FIND_K: 0.002,
  RESEARCH_FIND_CAP: 0.15,
  START_ENERGY: 40,

  // --- Rare drops ---------------------------------------------------------
  STEEL_DROP_K: 0.0009,
  STEEL_DROP_CAP: 0.07,
  PITY_THRESHOLD: 15,
  GEAR_DROP_K: 0.00003,
  GEAR_DROP_CAP: 0.005,
  /** Failed-zone salvage: chance at 1 level short, minus this per extra level, never below the floor. */
  SALVAGE_BASE: 0.28,
  SALVAGE_DECAY: 0.07,
  SALVAGE_FLOOR: 0.02,
  /** Salvage yield multiplier at 1 level short; divided by levels short. */
  SALVAGE_MULT_BASE: 0.15,

  // --- Economy ------------------------------------------------------------
  BASE_DAILY_DRAIN: 2,
  BUY_PRICE_MULT: 5,
  SELL_LABOR_COST: 1,
  DEMOLISH_REFUND: 0.8,
  DEMOLISH_LABOR: 1,
  EMERGENCY_ENERGY_BASE_COST: 40,
  EMERGENCY_ENERGY_STEP: 25,
  EMERGENCY_ENERGY_AMOUNT: 20,
  DEFAULT_CONVEYOR_AMOUNT: 5,
  SOLAR_ENERGY_PER_DAY: 3,
  /** Solar panels sit on the roof, not in a slot. Max per factory size level (index = level-1). */
  SOLAR_CAP: [1, 2, 3, 4] as const,

  // --- Turrets / raids ----------------------------------------------------
  AMMO_PER_SHOT: 2,
  AMMO_LOAD_AMOUNT: 10,   // 1.0 CHANGE: was 20
  AMMO_CAP: 200,
  RAID_APPROACH_TICKS: 10,
  RAID_GRACE_RUNS: 5,
  RAID_CHANCE: 0.2,
  RAID_STEAL_BASE: 0.15,
  RAID_STEAL_PER_TIER: 0.08,
  RAID_HISTORY_KEEP: 20,

  // --- Contracts ----------------------------------------------------------
  CONTRACT_SLOTS_BASE: 2,
  CONTRACT_SLOTS_WITH_ENDURANCE: 3,

  // --- Avatar -------------------------------------------------------------
  /** Level 1..5 → multiplier. */
  STAT_LEVEL_MULT: [1.0, 1.1, 1.2, 1.3, 1.4] as const,
  MAX_STAT_LEVEL: 5,
  MAX_GEAR_TIER: 4,
} as const;
