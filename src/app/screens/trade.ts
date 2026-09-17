import { h } from '../dom';
import { store } from '../store';
import { act, icon, sheet, stepper, toast } from '../ui';
import { C, CONTRACTS, RESOURCE_IDS, RESOURCES, contractById, contractProgress, nextContractSlotPrice, sellBonus, sellLaborCost, type ResourceId, type ResourceTier, type State } from '../../engine';

type Sub = 'market' | 'contracts';
let sub: Sub = 'market';
const KEEP_RAW = 30;

const GROUPS: Array<{ tier: ResourceTier; title: string }> = [
  { tier: 'raw', title: 'Raw' }, { tier: 'premium', title: 'Premium' }, { tier: 'rare', title: 'Rare' }, { tier: 'refined', title: 'Refined' }, { tier: 'ammo', title: 'Ammunition' },
];

export function renderTrade(s: State): Node {
  return h('div.stack',
    h('div.shop-head',
      h('div', h('h2', 'Trading Post'), h('p.dim.small', sub === 'market' ? 'Buy low, sell whatever you dug up.' : 'Weekly jobs. Deliver, get paid.')),
      h('div.seg.c2', { style: { minWidth: '190px' } },
        h(`button.btn.sm${sub === 'market' ? '.on' : ''}`, { onclick: () => { sub = 'market'; store.refresh(); } }, 'Market'),
        h(`button.btn.sm${sub === 'contracts' ? '.on' : ''}`, { onclick: () => { sub = 'contracts'; store.refresh(); } }, `Contracts${s.contracts.slots.some(c => contractProgress(s, c.id).ready && !c.done) ? ' •' : ''}`))),
    sub === 'market' ? market(s) : contracts(s));
}

function market(s: State): Node {
  const laborEach = sellLaborCost(s);
  const bonus = sellBonus(s);
  const surplus = RESOURCE_IDS.filter(id => RESOURCES[id].tier === 'raw' && s.res[id] > KEEP_RAW).map(id => ({ id, units: s.res[id] - KEEP_RAW }));
  const surplusUnits = surplus.reduce((a, x) => a + x.units, 0);
  const emergencyCost = C.EMERGENCY_ENERGY_BASE_COST + C.EMERGENCY_ENERGY_STEP * s.emergencyUsesThisWeek;

  return h('div.stack',
    h('div.card.stack',
      h('div.row.between', h('h3', 'Sell'), h('span.dim.small', laborEach ? `${laborEach} Labor per unit` : 'Labor-free', bonus > 1 && ` · +${Math.round((bonus - 1) * 100)}% Gold`)),
      surplusUnits > 0 && h('button.btn.block', { onclick: () => sellSurplus(surplus) }, `Sell raw surplus above ${KEEP_RAW} (${surplusUnits} units)`),
      GROUPS.map(g => {
        const ids = RESOURCE_IDS.filter(id => RESOURCES[id].tier === g.tier && s.res[id] > 0);
        if (ids.length === 0) return null;
        return h('div.stack', { style: { gap: '6px' } }, h('div.dim.small.shop-group', g.title),
          h('div.res-list', ids.map(id => h('button.res', { onclick: () => sellSheet(id) }, icon(id), RESOURCES[id].name, h('b', `${s.res[id]} · ${RESOURCES[id].sell}g`)))));
      }),
      RESOURCE_IDS.every(id => s.res[id] === 0) && h('div.empty', 'Nothing to sell yet.')),

    h('div.card.stack',
      h('div.row.between', h('h3', 'Buy'), h('span.dim.small', `${C.BUY_PRICE_MULT}× sell price — a bad deal on purpose`)),
      h('div.res-list', RESOURCE_IDS.filter(id => RESOURCES[id].buyable).map(id => h('button.res', { onclick: () => buySheet(id) }, icon(id), RESOURCES[id].name, h('b', `${RESOURCES[id].sell * C.BUY_PRICE_MULT}g`)))),
      h('div.row.between', { style: { paddingTop: '4px', borderTop: '1px solid var(--line)' } },
        h('div', h('div', 'Emergency energy'), h('div.dim.small', `+${C.EMERGENCY_ENERGY_AMOUNT} Energy for ${emergencyCost} Gold · price climbs each use, resets Monday`)),
        h('button.btn.sm', { onclick: () => act({ type: 'emergency_energy' }) }, 'Buy'))),
  );
}

function contracts(s: State): Node {
  return h('div.card.stack',
    h('div.row.between', h('h3', 'This week'), h('span.dim.small', `${s.contracts.slots.filter(c => c.done).length}/${s.contracts.slots.length} delivered`)),
    s.contracts.slots.length === 0 ? h('div.empty', 'New contracts arrive Monday.') :
      s.contracts.slots.map(slot => {
        const d = contractById(slot.id);
        const p = contractProgress(s, slot.id);
        return h(`div.card.flat.stack${slot.done ? '.locked' : ''}`,
          h('div.row.between', h('div', h('b', d.title), h('div.dim.small', `${p.current} / ${p.target}`)),
            slot.done ? h('span.c-gold', `+${d.reward} ✓`) :
              h('button.btn.sm', { disabled: !p.ready, onclick: () => act({ type: 'claim_contract', id: slot.id }) }, `Deliver +${d.reward}`)),
          h('div.bar', h('i', { style: { width: `${p.current / p.target * 100}%`, background: slot.done ? 'var(--ok)' : undefined } })));
      }),
    (() => { const price = nextContractSlotPrice(s); return h('div.row.between', { style: { paddingTop: '4px', borderTop: '1px solid var(--line)' } },
      h('div', h('div', 'Take on another contract'), h('div.dim.small', price === null ? 'No more on offer this week.' : `${price} Gold for one more slot this week · ${s.contracts.bought} bought so far`)),
      price !== null && h('button.btn.sm', { onclick: () => act({ type: 'buy_contract_slot' }) }, 'Buy')); })(),
    h('p.dim.small', `${CONTRACTS.length} contracts exist; more unlock as you build and explore.`));
}

function sellSurplus(items: Array<{ id: ResourceId; units: number }>): void {
  let gold = 0;
  for (const x of items) {
    const before = store.state.gold;
    if (!act({ type: 'sell', resource: x.id, units: x.units })) return;
    gold += store.state.gold - before;
  }
  toast(`Sold surplus for ${gold} Gold`, 'gold');
}

function sellSheet(id: ResourceId): void {
  const s = store.state;
  const have = s.res[id];
  const laborEach = sellLaborCost(s);
  let n = Math.min(have, 10);
  const line = h('p.dim.small');
  const upd = () => { line.textContent = `${n} × ${RESOURCES[id].sell}g × ${sellBonus(s).toFixed(2)} = ${Math.round(n * RESOURCES[id].sell * sellBonus(s))} Gold${laborEach ? `, costs ${n * laborEach} Labor` : ''}`; };
  upd();
  const st = stepper(n, 1, have, v => { n = v; upd(); });
  sheet(close => h('div.stack', h('h2', `Sell ${RESOURCES[id].name}`), h('p.dim.small', `You have ${have}.`), st, line,
    h('div.seg.c2', h('button.btn', { onclick: () => { if (act({ type: 'sell', resource: id, units: have })) close(); } }, `Sell all ${have}`),
      h('button.btn.primary', { onclick: () => { if (act({ type: 'sell', resource: id, units: n })) close(); } }, 'Sell'))));
}
function buySheet(id: ResourceId): void {
  let n = 5;
  const price = RESOURCES[id].sell * C.BUY_PRICE_MULT;
  const line = h('p.dim.small');
  const upd = () => { line.textContent = `${n} × ${price}g = ${n * price} Gold`; };
  upd();
  sheet(close => h('div.stack', h('h2', `Buy ${RESOURCES[id].name}`),
    stepper(n, 1, 99, v => { n = v; upd(); }), line,
    h('button.btn.primary.block', { onclick: () => { if (act({ type: 'buy', resource: id, units: n })) close(); } }, 'Buy')));
}
