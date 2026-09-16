/** Tiny element helper. h('div.card', {onclick}, 'text', child) */
type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, unknown>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: `${K}${string}` | K, ...args: Array<Props | Child>): HTMLElementTagNameMap[K] {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name as K);
  if (classes.length) el.className = classes.join(' ');
  for (const a of args) {
    if (a && typeof a === 'object' && !(a instanceof Node) && !Array.isArray(a)) {
      for (const [k, v] of Object.entries(a)) {
        if (v === undefined || v === null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
        else if (k in el && k !== 'list') (el as unknown as Record<string, unknown>)[k] = v;
        else el.setAttribute(k, String(v));
      }
    } else append(el, a as Child);
  }
  return el;
}
function append(el: Element, c: Child): void {
  if (c === null || c === undefined || c === false) return;
  if (Array.isArray(c)) { for (const x of c) append(el, x); return; }
  el.append(c instanceof Node ? c : String(c));
}
/** Parse an SVG/HTML string into an element. */
export function svg(markup: string): SVGElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as unknown as SVGElement;
}
export const fmt = (n: number) => (Math.abs(n) >= 10000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));
