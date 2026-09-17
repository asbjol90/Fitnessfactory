import { h, svg } from '../dom';
import { sheet, bagChips, icon } from '../ui';
import { buildingArt, turretArt } from '../../art/nodes';
import {
  BUILDINGS, BUILDING_IDS, C, RESOURCES, TURRETS, TURRET_COMBAT, TURRET_IDS, WORKSHOP_UNLOCK, WAVES, ZONES,
  type BuildingId, type ResourceId, type TurretId,
} from '../../engine';

/** Which buildings/turrets consume a resource, and which produce it. */
function producersOf(id: ResourceId): string[] {
  const out: string[] = [];
  for (const b of Object.values(BUILDINGS)) {
    const all = [...b.recipes, ...b.upgrades.flatMap(u => u.recipes)];
    if (all.some(r => r.output[id] || r.bonus?.resource === id)) out.push(b.name);
  }
  if (RESOURCES[id].tier === 'raw' || RESOURCES[id].tier === 'premium') out.push('Cardio loot');
  if (id === 'hardened_steel') out.push('Rare cardio find');
  return [...new Set(out)];
}
function consumersOf(id: ResourceId): string[] {
  const out: string[] = [];
  for (const b of Object.values(BUILDINGS)) {
    const all = [...b.recipes, ...b.upgrades.flatMap(u => u.recipes)];
    if (all.some(r => r.inputs[id])) out.push(b.name);
    if (b.cost.res[id] || b.upgrades.some(u => u.cost.res[id])) out.push(`${b.name} (build)`);
  }
  for (const t of Object.values(TURRETS)) if (t.ammo === id) out.push(`${t.name} ammo`);
  return [...new Set(out)];
}

export function openBuildingInfo(id: BuildingId): void {
  const d = BUILDINGS[id];
  const inputs = [...new Set([...d.recipes, ...d.upgrades.flatMap(u => u.recipes)].flatMap(r => Object.keys(r.inputs) as ResourceId[]))];
  const outputs = [...new Set([...d.recipes, ...d.upgrades.flatMap(u => u.recipes)].flatMap(r => [...(Object.keys(r.output) as ResourceId[]), ...(r.bonus ? [r.bonus.resource] : [])]))];
  const gate = d.gate.kind === 'infra' ? `Needs ${d.gate.infra.map(i => i.replace(/_/g, ' ')).join(' and ')}.`
    : d.gate.kind === 'upgrade' ? `Needs the ${BUILDINGS[d.gate.building].upgrades.find(u => u.id === (d.gate as { upgrade: string }).upgrade)?.name}.` : '';
  sheet(() => h('div.stack',
    h('div.row', svg(`<svg class="st-run" width="144" height="96" viewBox="0 -8 96 72">${buildingArt(id, null)}</svg>`),
      h('div', h('h2', d.name), h('div.dim.small', `${d.floor === 'main' ? 'Main floor' : 'Workshop floor'} · ${d.drain} Energy/day upkeep`))),
    h('div.card.flat.stack',
      h('h3', 'Recipes'),
      d.recipes.map(r => h('div.small', h('b', r.name), ': ', bagChips(r.inputs), h('span.dim', ' → '), bagChips(r.output),
        h('div.dim', `${r.labor} Labor + ${r.energy} Energy per run${r.bonus ? ` · ${Math.round(r.bonus.chance * 100)}% chance of a bonus ${RESOURCES[r.bonus.resource].name}` : ''}`)))),
    d.upgrades.length > 0 && h('div.card.flat.stack', h('h3', 'Paths (pick one, permanent)'),
      d.upgrades.map(u => h('div.small', h('b', u.name), ` — ${u.tagline}. ${u.drain} Energy/day. `,
        u.recipes.map(r => `${r.name}: ${r.labor}L ${r.energy}E`).join(' · '),
        u.recipes.some(r => !d.recipes.some(x => x.id === r.id)) && h('div.c-gold', `Unlocks: ${u.recipes.filter(r => !d.recipes.some(x => x.id === r.id)).map(r => r.name).join(', ')}`)))),
    h('div.card.flat.stack', h('h3', 'Fed by'),
      inputs.map(r => h('div.small', icon(r, 14), ` ${RESOURCES[r].name}`, h('span.dim', ` — from ${producersOf(r).join(', ')}`)))),
    h('div.card.flat.stack', h('h3', 'Feeds'),
      outputs.map(r => { const used = consumersOf(r).filter(c => c !== d.name && !c.endsWith('(build)')); return h('div.small', icon(r, 14), ` ${RESOURCES[r].name}`, h('span.dim', ` — ${used.length ? `used by ${used.join(', ')}` : 'end product'}; sells for ${RESOURCES[r].sell}g`)); })),
    h('div.card.flat.stack', h('h3', 'To build'), bagChips(d.cost.res), h('div.dim.small', `${d.cost.gold ? `${d.cost.gold} Gold. ` : ''}${d.cost.labor ? `${d.cost.labor} Labor. ` : ''}${gate}${d.floor === 'workshop' ? ` Workshop opens with ${WORKSHOP_UNLOCK.mainBuildings} main-floor buildings or ${WORKSHOP_UNLOCK.contracts} delivered contracts.` : ''}`)),
    h('p.dim.small', 'Belts can feed this building automatically once Conveyor Systems is researched. Buildings can be built more than once.'),
  ));
}

export function openTurretInfo(id: TurretId): void {
  const d = TURRETS[id];
  const cs = TURRET_COMBAT[id];
  sheet(() => h('div.stack',
    h('div.row', svg(`<svg width="96" height="64" viewBox="0 0 96 64">${turretArt(id)}</svg>`),
      h('div', h('h2', d.name), h('div.dim.small', `Tier ${d.tier} · ${d.blurb}`))),
    h('div.card.flat.stack', h('h3', 'In a raid'),
      h('p.small', `Range ${cs.range} cell${cs.range > 1 ? 's' : ''} (any direction). ${cs.damage} damage, ${cs.rate} shot${cs.rate > 1 ? 's' : ''} per tick while a raider is in range. Targets whoever is furthest along the road.`),
      h('p.small', 'Ammo: ', icon(d.ammo, 14), ` ${RESOURCES[d.ammo].name}, ${C.AMMO_PER_SHOT} per shot. Made by: ${producersOf(d.ammo).join(', ')}.`)),
    h('div.card.flat.stack', h('h3', 'Crews it will face'),
      WAVES.map(w => h('div.row.between.small', h('span', ZONES[w.tier - 1]!.name), h('span.dim', w.groups.map(g => `${g.count}×${g.hp}hp`).join(' + '))))),
    h('div.card.flat.stack', h('h3', 'To place'), bagChips(d.cost.res), h('div.dim.small', `${d.cost.gold ? `${d.cost.gold} Gold. ` : ''}${d.cost.labor ? `${d.cost.labor} Labor.` : ''} Buy on the Factory wall, position on the Defence field.`)),
    h('p.dim.small', 'Load ammo by hand or with a belt. An empty turret does nothing.'),
  ));
}

export const isBuildingId = (x: string): x is BuildingId => (BUILDING_IDS as string[]).includes(x);
export const isTurretId = (x: string): x is TurretId => (TURRET_IDS as string[]).includes(x);
