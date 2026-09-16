import { h } from '../dom';
import { store } from '../store';
import { act, icon, sheet, stepper } from '../ui';
import { C, CONTRACTS, RESOURCE_IDS, RESOURCES, contractById, contractProgress, sellBonus, sellLaborCost, type ResourceId, type State } from '../../engine';

export function renderTrade(s: State): Node {
  const laborEach = sellLaborCost(s);
  const bonus = sellBonus(s);
  const owned = RESOURCE_IDS.filter(id => s.res[id] > 0);
  const emergencyCost = C.EMERGENCY_ENERGY_BASE_COST + C.EMERGENCY_ENERGY_STEP * s.emergencyUsesThisWeek;

  return h('div.stack',
    h('div.card.stack',
      h('div.row.between', h('h2', 'Contracts'), h('span.dim.small', `${s.contracts.slots.filter(c => c.done).length}/${s.contracts.slots.length} this week`)),
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
      h('p.dim.small', `${CONTRACTS.length} contracts exist; more unlock as you build and explore.`)),

    h('div.card.stack',
      h('div.row.between', h('h2', 'Sell'), h('span.dim.small', laborEach ? `${laborEach} Labor per unit sold` : 'Free to sell', bonus > 1 && ` · +${Math.round((bonus - 1) * 100)}% Gold`)),
      owned.length === 0 ? h('div.empty', 'Nothing to sell yet.') :
        h('div.res-list', owned.map(id => h('button.res', { onclick: () => sellSheet(id) }, icon(id), RESOURCES[id].name, h('b', `${s.res[id]} · ${RESOURCES[id].sell}g`))))),

    h('div.card.stack',
      h('h2', 'Buy'),
      h('p.dim.small', `Always a bad deal: ${C.BUY_PRICE_MULT}× the sell price. For when you are one Coal short.`),
      h('div.res-list', RESOURCE_IDS.filter(id => RESOURCES[id].buyable).map(id => h('button.res', { onclick: () => buySheet(id) }, icon(id), RESOURCES[id].name, h('b', `${RESOURCES[id].sell * C.BUY_PRICE_MULT}g`))))),

    h('div.card.stack',
      h('div.row.between', h('div', h('h3', 'Emergency energy'), h('div.dim.small', `+${C.EMERGENCY_ENERGY_AMOUNT} Energy for ${emergencyCost} Gold · price rises each use, resets Monday`)),
        h('button.btn.sm', { onclick: () => act({ type: 'emergency_energy' }) }, 'Buy'))),
  );
}

function sellSheet(id: ResourceId): void {
  const s = store.state;
  const have = s.res[id];
  const laborEach = sellLaborCost(s);
  let n = Math.min(have, 10);
  const line = h('p.dim.small');
  const upd = () => { line.textContent = `${n} × ${RESOURCES[id].sell}g × ${sellBonus(s).toFixed(2)} = ${Math.round(n * RESOURCES[id].sell * sellBonus(s))} Gold${laborEach ? `, costs ${n * laborEach} Labor` : ''}`; };
  upd();
  sheet(close => h('div.stack', h('h2', `Sell ${RESOURCES[id].name}`), h('p.dim.small', `You have ${have}.`),
    stepper(n, 1, have, v => { n = v; upd(); }), line,
    h('div.seg.c2', h('button.btn', { onclick: () => { n = have; upd(); (document.querySelector('.sheet .stepper input') as HTMLInputElement).value = String(n); } }, 'All'),
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
