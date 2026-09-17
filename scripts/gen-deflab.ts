import { CELL, DEFENCE_CSS, barricadeTop, fieldTile, gateTile, raiderTop, roadTile, turretTop, wallTile } from '../src/art/defence2';
import { WALLS, cellIndex } from '../src/engine';
import { writeFileSync } from 'node:fs';
const tokens = `:root{--bg:#17140F;--panel:#221E18;--panel-2:#2C2720;--line:#3B342B;--ink:#EDE5D8;--ink-dim:#A2978A;--hazard:#E8B93F;--hazard-ink:#1A1400;--steel:#6E6A60;--steel-dk:#403C36;--steel-lt:#9C968A;--brick:#8E4E3C;--brick-dk:#5C3126;--ember:#FF8A3D;--flame:#FFB347;--smoke:#7A7268;--glass:#7FC4CF;--copper:#B47D48;--floor:#24201A;--pad:#2E2921;--pad-hi:#3A342B;--pad-edge:#4A4236;--ok:#7DBF7A;--danger:#D9534F;--dirt:#1C1811;--dirt-2:#29231A;--road:#3A2F24;--road-rut:#2A211A;--wall:#5A4034;--wall-mortar:#362720;--wall-top:#7B5A48;--cardio:#5CB2C0}`;
const defs = `<defs><pattern id="p-brick" width="16" height="8" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="var(--wall)"/><path d="M0 4H16M8 0V4M0 4V8M16 4V8" stroke="var(--wall-mortar)" stroke-width="1"/></pattern><pattern id="p-hazard" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="var(--hazard)"/><rect x="6" width="6" height="12" fill="var(--hazard-ink)"/></pattern></defs>`;
const css = `${tokens}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif}main{max-width:560px;margin:0 auto;padding:16px 12px 40px}h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:18px 0 6px}p{margin:0;color:var(--ink-dim);font-size:14px;line-height:1.4}
button{font:inherit;color:var(--ink);background:var(--panel-2);border:1px solid var(--line);border-radius:8px;min-height:36px;padding:0 10px;cursor:pointer}button.on{border-color:var(--hazard);color:var(--hazard)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px;margin-top:10px;display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:center}
.card svg{width:100%;height:auto;display:block;background:var(--dirt);border-radius:6px}.card h3{margin:0 0 4px;font-size:14px}.seg{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.seg button{min-height:32px;font-size:12px;padding:0}
.raiders{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.raiders .card{grid-template-columns:1fr;text-align:center}.raiders .seg{grid-template-columns:repeat(3,1fr)}
.field svg{width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--line)}
.ranges .card{grid-template-columns:150px 1fr}.ranges .pair{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ranges .pair svg{background:var(--panel-2)}
${DEFENCE_CSS}`;
const turrets = ['scrap_launcher', 'shotgun', 'assault_rifle', 'minigun', 'double_minigun'] as const;
const names: Record<string, string> = { scrap_launcher: 'Scrap Launcher', shotgun: 'Shotgun', assault_rifle: 'Assault Rifle', minigun: 'Minigun', double_minigun: 'Double Minigun' };
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Defence lab</title><style>${css}</style></head><body><main>
<h1>Defence lab</h1><p>Turrets from above with four states, three raiders with walk cycles, and the field dressed. Tap states; the field at the bottom runs a canned skirmish on loop.</p>
<h2>Turrets</h2>`;
for (const id of turrets) html += `<div class="card"><svg viewBox="0 0 ${CELL} ${CELL}" style="--a:-90deg" data-t="${id}">${fieldTile(0, 0, 3)}${turretTop(id, 0, 0, -90, 'idle').replace('style="transform:rotate(-90deg)"', 'style="--a:-90deg;transform:rotate(-90deg)"')}</svg><div><h3>${names[id]}</h3><div class="seg"><button data-s="idle" class="on">Idle</button><button data-s="track">Track</button><button data-s="fire">Fire</button><button data-s="dry">Dry</button></div></div></div>`;
html += `<h2>Range: today vs proposed</h2><p>Left: today (square reach). Right: proposed (round reach, Shotgun 1.5 so it still reaches diagonals). Cells a turret in the centre can hit.</p><div class="ranges">`;
const ranges: Array<[string, number, number]> = [['Scrap Launcher', 2, 2], ['Shotgun', 1, 1.5], ['Assault Rifle', 3, 3], ['Minigun', 2, 2], ['Double Minigun', 2, 2]];
for (const [name, cheb, eu] of ranges) {
  const grid = (fn: (dx: number, dy: number) => boolean) => { let s = `<svg viewBox="0 0 70 70">`; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const on = fn(dx, dy); s += `<rect x="${(dx + 3) * 10 + 1}" y="${(dy + 3) * 10 + 1}" width="8" height="8" rx="1" fill="${dx === 0 && dy === 0 ? 'var(--hazard)' : on ? 'var(--cardio)' : 'var(--panel-2)'}" opacity="${on || (dx === 0 && dy === 0) ? 1 : .6}"/>`; } return s + `</svg>`; };
  const a = grid((dx, dy) => Math.max(Math.abs(dx), Math.abs(dy)) <= cheb), b = grid((dx, dy) => Math.hypot(dx, dy) <= eu);
  const na = [...Array(49).keys()].filter(i => { const dx = i % 7 - 3, dy = Math.floor(i / 7) - 3; return Math.max(Math.abs(dx), Math.abs(dy)) <= cheb; }).length - 1;
  const nb = [...Array(49).keys()].filter(i => { const dx = i % 7 - 3, dy = Math.floor(i / 7) - 3; return Math.hypot(dx, dy) <= eu; }).length - 1;
  html += `<div class="card rng"><div class="pair">${a}${b}</div><div><h3>${name}</h3><p style="font-size:12px">${na} cells → ${nb} cells</p></div></div>`;
}
html += `</div>`;
html += `<h2>Raiders</h2><div class="raiders">`;
for (const [type, name, blurb] of [['scrapper', 'Scrapper', 'pipe, bandana'], ['runner', 'Runner', 'lean, red headband'], ['brute', 'Brute', 'helmet, shield, sledge']] as const)
  html += `<div class="card"><svg viewBox="-26 -30 52 60">${fieldTile(-26, -30, 5)}${raiderTop(type, 0, 0, 0.7)}</svg><div><h3>${name}</h3><p style="font-size:11px">${blurb}</p><div class="seg"><button data-r="walk" class="on">Walk</button><button data-r="hit">Hit</button><button data-r="die">Die</button></div></div></div>`;
html += `</div><h2>Field (Stone Wall)</h2><div class="field">`;
// field mockup on wall tier 2
const wall = WALLS[1]!;
const road = wall.path; const roadSet = new Map(road.map((c, i) => [cellIndex(c), i]));
const W = 7 * CELL + 16, H = 6 * CELL + 16;
let f = `<svg viewBox="0 0 ${W} ${H}">${defs}<rect width="${W}" height="${H}" fill="var(--dirt)"/>`;
for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
  const x = 8 + c * CELL, y = 8 + r * CELL, i = r * 7 + c;
  if (r === 5) f += c === 3 ? gateTile(x, y, 0.75) : wallTile(x, y);
  else if (roadSet.has(i)) { const k = roadSet.get(i)!; const prev = road[k - 1], next = road[k + 1]; const dir = prev && next && prev.c !== next.c && prev.r !== next.r ? 'c' : (prev ?? next)!.c === road[k]!.c ? 'v' : 'h'; f += roadTile(x, y, dir, i); }
  else f += fieldTile(x, y, i);
}
f += barricadeTop(8 + 1 * CELL, 8 + 3 * CELL, 0.6);
f += turretTop('shotgun', 8 + 1 * CELL, 8 + 2 * CELL, 90, 'fire').replace('style="transform:rotate(90deg)"', 'style="--a:90deg;transform:rotate(90deg)"');
f += turretTop('assault_rifle', 8 + 4 * CELL, 8 + 1 * CELL, 160, 'track').replace('style="transform:rotate(160deg)"', 'style="--a:160deg;transform:rotate(160deg)"');
f += turretTop('minigun', 8 + 4 * CELL, 8 + 4 * CELL, -100, 'idle').replace('style="transform:rotate(-100deg)"', 'style="--a:-100deg;transform:rotate(-100deg)"');
f += turretTop('scrap_launcher', 8 + 2 * CELL, 8 + 0 * CELL, 180, 'dry').replace('style="transform:rotate(180deg)"', 'style="--a:180deg;transform:rotate(180deg)"');
f += raiderTop('scrapper', 8 + 0.5 * CELL, 8 + 1.2 * CELL, 0.9) + raiderTop('runner', 8 + 0.5 * CELL, 8 + 2.4 * CELL, 0.5) + raiderTop('brute', 8 + 0.5 * CELL, 8 + 0.3 * CELL, 1) + raiderTop('scrapper', 8 + 2.5 * CELL, 8 + 3.5 * CELL, 0.3);
f += `<line x1="${8 + 1.5 * CELL}" y1="${8 + 2.5 * CELL}" x2="${8 + 0.5 * CELL}" y2="${8 + 2.4 * CELL}" stroke="var(--flame)" stroke-width="2"/>`;
f += `</svg>`;
html += f + `</div><p style="margin-top:8px">Left to right on the field: a dry Scrap Launcher (lamp, barrel drooped), a Shotgun firing at the Runner, an Assault Rifle tracking, a Minigun idling; a barricade on the road at 60%; four raiders walking. The gate shows 75% HP.</p>`;
html += `</main><script>
document.querySelectorAll('[data-s]').forEach(b=>b.addEventListener('click',()=>{const card=b.closest('.card');card.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');const t=card.querySelector('.turret');t.setAttribute('class','turret t-'+b.dataset.s);if(b.dataset.s==='fire'){setTimeout(()=>{t.setAttribute('class','turret t-track');},300);}}));
document.querySelectorAll('[data-r]').forEach(b=>b.addEventListener('click',()=>{const card=b.closest('.card');card.querySelectorAll('[data-r]').forEach(x=>x.classList.remove('on'));b.classList.add('on');const w=card.querySelector('.walker');w.classList.remove('hit','dying');void w.getBoundingClientRect();if(b.dataset.r==='hit')w.classList.add('hit');if(b.dataset.r==='die'){w.classList.add('dying');setTimeout(()=>{w.classList.remove('dying');card.querySelector('[data-r="walk"]').click();},1500);}}));
// canned skirmish: the shotgun fires every 900ms
setInterval(()=>{document.querySelectorAll('.field .turret').forEach((t,i)=>{if(i===1){t.setAttribute('class','turret t-fire');setTimeout(()=>t.setAttribute('class','turret t-track'),300);}});},900);
</script></body></html>`;
writeFileSync('/mnt/user-data/outputs/defence-lab.html', html);
console.log('ok');
