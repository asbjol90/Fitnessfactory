import '../styles.css';
import { h, svg, fmt } from './dom';
import { store } from './store';
import { toast, icon } from './ui';
import { RESOURCES, type GameEvent, type ResourceId, type State } from '../engine';
import { renderTrain } from './screens/train';
import { renderFactory } from './screens/factory';
import { renderAvatar } from './screens/avatar';
import { renderTrade } from './screens/trade';
import { renderLab, settingsSheet } from './screens/lab';

type TabId = 'train' | 'factory' | 'avatar' | 'trade' | 'lab';
const TABS: Array<{ id: TabId; label: string; path: string; render: (s: State) => Node }> = [
  { id: 'train', label: 'Train', path: 'M4 12h3l2-6 4 12 3-9 2 3h2', render: renderTrain },
  { id: 'factory', label: 'Factory', path: 'M3 20V10l5 3V10l5 3V10l5 3v7H3zM7 10V6h3v4', render: renderFactory },
  { id: 'avatar', label: 'Avatar', path: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0', render: renderAvatar },
  { id: 'trade', label: 'Trade', path: 'M3 9l2-4h14l2 4M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9zm2 5v6h14v-6', render: renderTrade },
  { id: 'lab', label: 'Lab', path: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3', render: renderLab },
];

let current: TabId = (location.hash.slice(1) as TabId) || 'train';
if (!TABS.some(t => t.id === current)) current = 'train';
let factoryAttention = false;

const app = document.getElementById('app')!;
const topbar = h('div.topbar');
const main = h('main');
const tabbar = h('div.tabbar', h('div.tabbar-inner', TABS.map(t =>
  h(`button.tab`, { id: `tab-${t.id}`, onclick: () => go(t.id) },
    svg(`<svg viewBox="0 0 24 24"><path d="${t.path}"/></svg>`), t.label))));
app.append(topbar, main, tabbar);

function go(id: TabId) {
  current = id;
  if (id === 'factory') factoryAttention = false;
  history.replaceState(null, '', `#${id}`);
  render(store.state);
  main.scrollTo({ top: 0 });
}

const POOLS: Array<{ key: 'gold' | 'labor' | 'energy' | 'research'; cls: string }> = [
  { key: 'gold', cls: 'c-gold' }, { key: 'labor', cls: 'c-strength' }, { key: 'energy', cls: 'c-energy' }, { key: 'research', cls: 'c-research' },
];
const poolEls = new Map<string, HTMLElement>();
function renderTop(s: State) {
  topbar.replaceChildren(...POOLS.map(p => {
    const el = h(`div.pool.${p.cls}`, { title: p.key }, icon(p.key === 'labor' ? 'iron' : p.key === 'energy' ? 'refined_catalyst' : p.key, 18), h('span', fmt(s[p.key])));
    poolEls.set(p.key, el);
    return el;
  }), h('button.gear-btn', { title: 'Settings', onclick: () => settingsSheet() },
    svg('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>')));
}
function flashPool(key: string, delta: number) {
  const el = poolEls.get(key);
  if (!el || delta === 0) return;
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  el.append(h('span.delta', { style: { color: delta > 0 ? 'var(--ok)' : 'var(--danger)' } }, `${delta > 0 ? '+' : ''}${delta}`));
  setTimeout(() => el.querySelector('.delta')?.remove(), 1200);
}

function render(s: State) {
  renderTop(s);
  for (const t of TABS) document.getElementById(`tab-${t.id}`)!.classList.toggle('active', t.id === current);
  const factoryTab = document.getElementById('tab-factory')!;
  factoryTab.querySelector('.badge')?.remove();
  if (factoryAttention && current !== 'factory') factoryTab.append(h('span.badge'));
  const screen = TABS.find(t => t.id === current)!;
  main.replaceChildren(screen.render(s));
}

function handleEvents(s: State, events: GameEvent[]) {
  let gold = 0, labor = 0, energy = 0, research = 0;
  for (const e of events) {
    switch (e.type) {
      case 'gain': if (e.pool === 'gold') gold += e.amount; else if (e.pool === 'labor') labor += e.amount; else if (e.pool === 'energy') energy += e.amount; else research += e.amount; break;
      case 'sold': gold += e.gold; break;
      case 'bought': gold -= e.gold; break;
      case 'contract_done': gold += e.reward; toast(`Contract delivered: +${e.reward} Gold`, 'gold'); break;
      case 'level_up': toast(`${cap(e.stat)} reached level ${e.level}!`, 'gold', 4000); break;
      case 'gear': toast(`Gear tier ${e.tier} equipped`, 'gold', 3500); break;
      case 'raid_teaser': factoryAttention = true; toast('Something happened back at the base. Check the Factory.', 'danger', 5000); break;
      case 'week': toast('New week: fresh contracts.', 'plain', 3000); break;
      case 'day': if (e.days && e.energyAfter < e.energyBefore) energy += e.energyAfter - e.energyBefore; break;
      case 'demolished': gold += e.refund; break;
      case 'loot': {
        if (e.premium) toast(`Premium find: ${RESOURCES[e.premium].name}!`, 'gold', 3500);
        if (e.steel) toast(e.pity ? 'Hardened Steel — persistence pays off.' : 'Hardened Steel — rare find!', 'gold', 3500);
        break;
      }
    }
  }
  flashPool('gold', gold); flashPool('labor', labor); flashPool('energy', energy); flashPool('research', research);
  void s;
}
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

store.subscribe((s, events) => { render(s); handleEvents(s, events); });
render(store.state);
if (store.migrated) toast('Your v1 factory was carried over.', 'ok', 5000);
if (!store.state.avatar.id) go('avatar');

// PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* offline is a bonus, not a requirement */ });
}
window.addEventListener('hashchange', () => { const id = location.hash.slice(1) as TabId; if (TABS.some(t => t.id === id) && id !== current) go(id); });
export { go };
