import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
execSync('npx esbuild src/app/sfx.ts --bundle --format=iife --global-name=SFXMOD --outfile=/tmp/sfx.js', { stdio: 'inherit' });
const js = readFileSync('/tmp/sfx.js', 'utf8');
const groups: Array<[string, Array<[string, string]>]> = [
  ['Training', [['logCardio', 'Cardio logged'], ['logStrength', 'Strength logged'], ['logFlex', 'Flexibility logged'], ['habit', 'Habit ticked'], ['emptyHanded', 'Empty-handed run']]],
  ['Factory', [['make', 'Make (generic clank)'], ['makeHammer', 'Make: forge hammer'], ['makeHiss', 'Make: oven hiss'], ['makeCrunch', 'Make: crusher crunch'], ['belt', 'Belt laid'], ['coin', 'Contract paid'], ['sell', 'Sold goods'], ['build', 'Machine built'], ['demolish', 'Demolished'], ['starved', 'Machine starved (click)']]],
  ['Defence', [['raidAlert', 'Raid alert'], ['mortar', 'Scrap Launcher'], ['shotgun', 'Shotgun'], ['rifle', 'Assault Rifle'], ['minigun', 'Minigun burst'], ['doubleMinigun', 'Double Minigun burst'], ['hit', 'Raider hit'], ['march3', 'March (3 raiders)'], ['march12', 'March (12 raiders)'], ['raiderDown', 'Raider down'], ['gateHit', 'Gate hit'], ['rally', 'Rally'], ['repelled', 'Repelled'], ['breach', 'Breach']]],
];
const css = `:root{--bg:#17140F;--panel:#221E18;--panel-2:#2C2720;--line:#3B342B;--ink:#EDE5D8;--ink-dim:#A2978A;--hazard:#E8B93F;--hazard-ink:#1A1400}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif}main{max-width:560px;margin:0 auto;padding:16px 12px 40px}h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 8px;color:var(--ink-dim);text-transform:uppercase;letter-spacing:.08em}p{margin:0;color:var(--ink-dim);font-size:14px;line-height:1.4}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}button{font:inherit;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:10px;min-height:52px;padding:0 12px;cursor:pointer;text-align:left}button:active{background:var(--panel-2);border-color:var(--hazard)}
.top{position:sticky;top:0;background:var(--bg);padding:8px 0 10px;z-index:2}.vol{display:flex;align-items:center;gap:10px;margin-top:8px}input[type=range]{flex:1}
.start{background:var(--hazard);color:var(--hazard-ink);font-weight:600;width:100%;min-height:48px;border:0}
.seq button{width:100%;margin-top:6px}`;
let html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sound lab</title><style>${css}</style></head><body><main>
<div class="top"><h1>Sound lab</h1><p>Everything is synthesised — no audio files. Tap Enable once (phones need a tap before any sound), then audition.</p>
<button class="start" id="on">Enable sound</button><div class="vol"><span>Volume</span><input type="range" id="vol" min="0" max="1" step="0.05" value="0.6"></div></div>`;
for (const [title, items] of groups) { html += `<h2>${title}</h2><div class="grid">`; for (const [id, label] of items) html += `<button data-s="${id}">${label}</button>`; html += `</div>`; }
html += `<h2>Sequences</h2><div class="seq"><button data-seq="fight">A fight: alert → shots → hits → repelled</button><button data-seq="day">A session: cardio → make → coin</button></div>
<script>${js}</script><script>
const S = SFXMOD.SFX; const on = document.getElementById('on');
on.addEventListener('click', () => { SFXMOD.unlock(); on.textContent = 'Sound on'; S.coin(); });
document.getElementById('vol').addEventListener('input', e => SFXMOD.setVolume(parseFloat(e.target.value)));
document.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => { SFXMOD.unlock(); const id = b.dataset.s; if (id === 'march3') S.march(3); else if (id === 'march12') S.march(12); else S[id](); }));
const wait = ms => new Promise(r => setTimeout(r, ms));
document.querySelectorAll('[data-seq]').forEach(b => b.addEventListener('click', async () => { SFXMOD.unlock();
  if (b.dataset.seq === 'fight') { S.raidAlert(); await wait(900); for (let t = 0; t < 8; t++) { S.march(6 - Math.floor(t / 2)); if (t > 1) { S.rifle(); setTimeout(() => S.minigun(), 90); } if (t === 3 || t === 5) setTimeout(() => S.raiderDown(), 220); else if (t > 1) setTimeout(() => S.hit(), 160); if (t === 6) S.shotgun(); await wait(700); } await wait(300); S.repelled(); }
  else { S.logCardio(); await wait(700); S.makeHammer(); await wait(600); S.make(); await wait(600); S.coin(); }
}));
</script></main></body></html>`;
writeFileSync('/mnt/user-data/outputs/sound-lab.html', html); console.log('ok');
