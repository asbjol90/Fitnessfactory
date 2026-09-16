import { h, svg } from './dom';
import { iconSvg } from '../art/nodes';
import { RESOURCES, type Bag, type Cost, type ResourceId, type State } from '../engine';
import { store } from './store';

export const icon = (res: string, size = 16) => svg(iconSvg(res, size));

// ---------------------------------------------------------------- toasts
const toastRoot = h('div.toasts');
document.body.append(toastRoot);
export function toast(text: string, kind: 'plain' | 'ok' | 'danger' | 'gold' = 'plain', ms = 2600): void {
  const el = h(`div.toast${kind === 'plain' ? '' : '.' + kind}`, text);
  toastRoot.append(el);
  while (toastRoot.children.length > 3) toastRoot.firstElementChild?.remove();
  setTimeout(() => el.remove(), ms);
}

// ---------------------------------------------------------------- sheet
let openSheet: { el: HTMLElement; cleanup: () => void } | null = null;
export function sheet(build: (close: () => void) => Node, cleanup: () => void = () => {}): void {
  closeSheet();
  const close = () => { if (openSheet?.el === bg) closeSheet(); };
  const bg = h('div.sheet-bg', { onclick: (e: Event) => { if (e.target === bg) close(); } },
    h('div.sheet', h('div.handle'), build(close)));
  document.body.append(bg);
  openSheet = { el: bg, cleanup };
}
export function closeSheet(): void { if (!openSheet) return; openSheet.cleanup(); openSheet.el.remove(); openSheet = null; }
/** A sheet that redraws itself whenever the store changes. */
export function liveSheet(draw: (close: () => void) => Node): void {
  const box = h('div');
  let off = () => {};
  sheet(close => { const re = () => box.replaceChildren(draw(close)); re(); off = store.subscribe(re); return box; }, () => off());
}

/** Two-tap confirm: first tap arms the button, second within 3s fires. */
export function armed(label: string, onConfirm: () => void, cls = 'btn.danger'): HTMLButtonElement {
  let armedUntil = 0;
  const b = h(`button.${cls}`, label, {
    onclick: () => {
      if (Date.now() < armedUntil) { onConfirm(); return; }
      armedUntil = Date.now() + 3000;
      b.textContent = `Tap again to ${label.toLowerCase()}`;
      setTimeout(() => { if (Date.now() >= armedUntil) b.textContent = label; }, 3100);
    },
  }) as HTMLButtonElement;
  return b;
}

// ---------------------------------------------------------------- cost chips
export function costChips(s: State, cost: Partial<Cost> & { res?: Bag }): HTMLElement {
  const chips: Node[] = [];
  for (const [id, n] of Object.entries(cost.res ?? {}) as Array<[ResourceId, number]>) {
    chips.push(h(`span.chip${s.res[id] < n ? '.short' : ''}`, icon(id, 14), `${n} ${RESOURCES[id].name}`));
  }
  if (cost.gold) chips.push(h(`span.chip${s.gold < cost.gold ? '.short' : ''}`, icon('gold', 14), `${cost.gold} Gold`));
  if (cost.labor) chips.push(h(`span.chip${s.labor < cost.labor ? '.short' : ''}.c-strength`, `${cost.labor} Labor`));
  if (cost.research) chips.push(h(`span.chip${s.research < cost.research ? '.short' : ''}.c-research`, `${cost.research} Research`));
  return h('div.cost', chips);
}
export function bagChips(b: Bag): HTMLElement {
  return h('div.cost', (Object.entries(b) as Array<[ResourceId, number]>).filter(([, n]) => n > 0)
    .map(([id, n]) => h('span.chip', icon(id, 14), `${n} ${RESOURCES[id].name}`)));
}

/** Dispatch and toast the error if refused. Returns true on success. */
export function act(action: Parameters<typeof store.dispatch>[0]): boolean {
  const err = store.dispatch(action);
  if (err) { toast(err, 'danger'); return false; }
  return true;
}

export function stepper(value: number, min: number, max: number, onChange: (v: number) => void, step = 1): HTMLElement {
  const input = h('input.input', { type: 'number', inputmode: 'numeric', value: String(value), min: String(min), max: String(max) }) as HTMLInputElement;
  const set = (v: number) => { v = Math.max(min, Math.min(max, Math.round(v))); input.value = String(v); onChange(v); };
  input.addEventListener('change', () => set(Number(input.value) || min));
  return h('div.stepper',
    h('button.btn', { onclick: () => set(Number(input.value) - step) }, '−'),
    input,
    h('button.btn', { onclick: () => set(Number(input.value) + step) }, '+'));
}
