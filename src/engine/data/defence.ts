import type { Bag } from './core';
import type { TurretId } from './factory';

/** Grid outside the wall. Gate is the bottom-centre cell; row GRID_ROWS-1 is the wall itself. */
export const GRID_COLS = 7;
export const GRID_ROWS = 6;
export const GATE: Cell = { c: 3, r: 5 };
export interface Cell { c: number; r: number }
export const cellKey = (c: Cell) => `${c.c},${c.r}`;
export const cellIndex = (c: Cell) => c.r * GRID_COLS + c.c;
export const cellFromIndex = (i: number): Cell => ({ c: i % GRID_COLS, r: Math.floor(i / GRID_COLS) });
export const chebyshev = (a: Cell, b: Cell) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));

/** Straight-line walks between waypoints, inclusive, no diagonals. */
function walk(points: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (i === 0) { out.push(p); continue; }
    const prev = out[out.length - 1]!;
    const dc = Math.sign(p.c - prev.c), dr = Math.sign(p.r - prev.r);
    let cur = { ...prev };
    while (cur.c !== p.c || cur.r !== p.r) { cur = { c: cur.c + dc, r: cur.r + dr }; out.push(cur); }
  }
  return out;
}

export interface WallDef { tier: 1 | 2 | 3; name: string; hp: number; barricades: number; cost: Bag; gold: number; path: Cell[]; blurb: string; }
export const WALLS: WallDef[] = [
  { tier: 1, name: 'Palisade', hp: 0, barricades: 1, cost: {}, gold: 0, blurb: 'Sharpened logs. Raiders walk straight at the gate.',
    path: walk([{ c: 3, r: 0 }, { c: 3, r: 5 }]) },
  { tier: 2, name: 'Stone Wall', hp: 12, barricades: 2, cost: { stone: 30, gravel: 20 }, gold: 60, blurb: 'Adds a bend to the approach and a gate that takes hits.',
    path: walk([{ c: 0, r: 0 }, { c: 0, r: 3 }, { c: 3, r: 3 }, { c: 3, r: 5 }]) },
  { tier: 3, name: 'Reinforced Wall', hp: 30, barricades: 3, cost: { iron: 40, gravel: 30, precision_components: 3 }, gold: 150, blurb: 'A full switchback and an iron gate. Nothing gets in quickly.',
    path: walk([{ c: 6, r: 0 }, { c: 1, r: 0 }, { c: 1, r: 2 }, { c: 5, r: 2 }, { c: 5, r: 4 }, { c: 3, r: 4 }, { c: 3, r: 5 }]) },
];
export const wallDef = (tier: number): WallDef => WALLS[Math.max(0, Math.min(2, tier - 1))]!;

export const BARRICADE = { hp: 15, labor: 8, cost: { stone: 4 } as Bag };
export const RALLY = { labor: 12, damage: 12, cooldown: 2, reach: 1 };

/** Combat stats replace the old "shots per raid". Range is Chebyshev distance in cells. */
export interface TurretCombat { range: number; damage: number; rate: number; }
export const TURRET_COMBAT: Record<TurretId, TurretCombat> = {
  scrap_launcher: { range: 2, damage: 3, rate: 1 },
  shotgun: { range: 1, damage: 10, rate: 1 },
  assault_rifle: { range: 3, damage: 7, rate: 1 },
  minigun: { range: 2, damage: 5, rate: 2 },
  double_minigun: { range: 2, damage: 8, rate: 2 },
};

export type RaiderType = 'scrapper' | 'runner' | 'brute';
export interface RaiderDef { type: RaiderType; name: string; speed: number; attack: number; blurb: string; }
export const RAIDERS: Record<RaiderType, RaiderDef> = {
  scrapper: { type: 'scrapper', name: 'Scrapper', speed: 1, attack: 1, blurb: 'The common kind. Walks in, hits things with a pipe.' },
  runner: { type: 'runner', name: 'Runner', speed: 2, attack: 1, blurb: 'Fast and thin. Gets past slow turrets.' },
  brute: { type: 'brute', name: 'Brute', speed: 0.5, attack: 3, blurb: 'Slow, heavy, and hard on gates.' },
};

/** Wave per zone tier: how many of each, with HP. Tuned by scripts/defsim.ts. */
export interface WaveDef { tier: number; groups: Array<{ type: RaiderType; count: number; hp: number }>; }
export const WAVES: WaveDef[] = [
  { tier: 1, groups: [{ type: 'scrapper', count: 4, hp: 6 }] },
  { tier: 2, groups: [{ type: 'scrapper', count: 5, hp: 9 }, { type: 'brute', count: 1, hp: 24 }] },
  { tier: 3, groups: [{ type: 'scrapper', count: 6, hp: 14 }, { type: 'runner', count: 3, hp: 9 }, { type: 'brute', count: 2, hp: 45 }] },
  { tier: 4, groups: [{ type: 'scrapper', count: 8, hp: 16 }, { type: 'runner', count: 4, hp: 11 }, { type: 'brute', count: 3, hp: 48 }] },
  { tier: 5, groups: [{ type: 'scrapper', count: 10, hp: 20 }, { type: 'runner', count: 6, hp: 15 }, { type: 'brute', count: 4, hp: 80 }] },
];
export const waveDef = (tier: number): WaveDef => WAVES[Math.max(0, Math.min(WAVES.length - 1, tier - 1))]!;

/** Raiders enter this many per tick. */
export const SPAWN_PER_TICK = 2;
export const MAX_TICKS = 80;

/** Win drops. */
export const DROPS = { scrapPerKill: 0.6, bonusChance: 0.10 };
