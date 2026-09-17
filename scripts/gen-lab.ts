import { MACHINES } from '../src/art/machines';
import { readFileSync, writeFileSync } from 'node:fs';
const anim = readFileSync('src/art/machines.css', 'utf8');
const tokens = `:root{--bg:#17140F;--panel:#221E18;--panel-2:#2C2720;--line:#3B342B;--ink:#EDE5D8;--ink-dim:#A2978A;--hazard:#E8B93F;--hazard-ink:#1A1400;--steel:#6E6A60;--steel-dk:#403C36;--steel-lt:#9C968A;--brick:#8E4E3C;--brick-dk:#5C3126;--ember:#FF8A3D;--flame:#FFB347;--smoke:#7A7268;--glass:#7FC4CF;--copper:#B47D48;--floor:#24201A;--floor-line:#2C271F;--pad:#2E2921;--pad-hi:#3A342B;--pad-edge:#4A4236;--ok:#7DBF7A;--danger:#D9534F}`;
const css = `${tokens}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif}main{max-width:560px;margin:0 auto;padding:16px 12px 40px}h1{font-size:20px;margin:0 0 4px}p{margin:0;color:var(--ink-dim);font-size:14px;line-height:1.4}
.global{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:2}
button{font:inherit;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;min-height:40px;padding:0 10px;cursor:pointer}button.on{border-color:var(--hazard);color:var(--hazard)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px;margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center}
.card svg{width:100%;height:auto;display:block;background:var(--floor);border-radius:6px}
.card .meta h3{margin:0 0 2px;font-size:14px}.card .meta .m{color:var(--ink-dim);font-size:12px;margin-bottom:6px}
.card .seg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px}.card .seg button{min-height:32px;font-size:12px;padding:0 4px}
.card .make{margin-top:4px;width:100%;background:var(--hazard);color:var(--hazard-ink);border-color:transparent;font-weight:600;min-height:34px}
.floorrow{margin-top:14px}.floorrow svg{width:100%;background:var(--floor);border-radius:8px;margin-top:6px}
${anim}`;
const wrap = (m: typeof MACHINES[number], big: boolean) => `<svg class="st-run" viewBox="${big ? '0 -8 96 72' : '0 0 96 64'}" xmlns="http://www.w3.org/2000/svg" data-id="${m.id}">${m.draw()}
<g class="m-warn"><circle cx="88" cy="6" r="4" fill="var(--danger)"/><path d="M88 3v3M88 8v1" stroke="#000" stroke-width="1.2"/></g>
<circle class="m-ring" cx="48" cy="34" r="16" fill="none" stroke="var(--hazard)" stroke-width="2"/>
<g class="m-out"><path d="M60 40 L63 33 L77 33 L80 40Z" fill="#9AA7B5"/><path d="M63 33h14l-1 2H64Z" fill="#fff" opacity=".35"/></g></svg>`;
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Machine lab — all motions</title><style>${css}</style></head><body><main>
<h1>Machine lab: every motion, every state</h1><p>Top row switches all cards at once. Each card's own buttons override it. Make fires the burst on that card. The last block is the whole floor at real size in the Running state, so you can judge the total amount of motion.</p>
<div class="global"><button data-g="idle">All idle</button><button data-g="run" class="on">All running</button><button data-g="starved">All starved</button></div>`;
for (const m of MACHINES) html += `<div class="card">${wrap(m, true)}<div class="meta"><h3>${m.name}</h3><div class="m">motion: ${m.motion}</div><div class="seg"><button data-s="idle">Idle</button><button data-s="run" class="on">Run</button><button data-s="starved">Starved</button></div><button class="make">Make</button></div></div>`;
html += `<div class="floorrow"><p>Whole floor, running, real size:</p>`;
for (let i = 0; i < MACHINES.length; i += 4) {
  html += `<svg class="st-run" viewBox="0 0 440 78">`;
  MACHINES.slice(i, i + 4).forEach((m, k) => { html += `<g transform="translate(${8 + k * 108},8)"><rect width="96" height="64" rx="6" fill="var(--pad)" stroke="var(--pad-edge)"/>${m.draw()}</g>`; });
  html += `</svg>`;
}
html += `</div></main><script>
const setState=(svg,s)=>{svg.setAttribute('class','st-'+s);};
document.querySelectorAll('[data-g]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-g]').forEach(x=>x.classList.remove('on'));b.classList.add('on');document.querySelectorAll('.card svg, .floorrow svg').forEach(svg=>setState(svg,b.dataset.g));document.querySelectorAll('.card .seg button').forEach(x=>x.classList.toggle('on',x.dataset.s===b.dataset.g));}));
document.querySelectorAll('.card').forEach(card=>{const svg=card.querySelector('svg');card.querySelectorAll('[data-s]').forEach(b=>b.addEventListener('click',()=>{card.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');setState(svg,b.dataset.s);}));card.querySelector('.make').addEventListener('click',()=>{svg.classList.remove('burst');void svg.getBoundingClientRect();svg.classList.add('burst');setTimeout(()=>svg.classList.remove('burst'),1300);navigator.vibrate&&navigator.vibrate(20);});});
</script></body></html>`;
writeFileSync('/mnt/user-data/outputs/machine-lab.html', html);
console.log('ok');
