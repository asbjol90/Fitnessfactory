/**
 * Machine stills, second design pass. Every drawing is a 96×64 box, front-on
 * and slightly elevated, with a silhouette that names the machine and one
 * colour accent. No animation classes here — motion is added per machine
 * later on exactly one element.
 */
const V = {
  steel: 'var(--steel)', dk: 'var(--steel-dk)', lt: 'var(--steel-lt)',
  brick: 'var(--brick)', brickDk: 'var(--brick-dk)', hazard: 'var(--hazard)',
  ember: 'var(--ember)', flame: 'var(--flame)', smoke: 'var(--smoke)', glass: 'var(--glass)', copper: 'var(--copper)',
  bg: 'var(--bg)', ok: 'var(--ok)', green: '#9CD64A', violet: '#B48CF2', brass: '#C9A43B', ink: '#1a1a1a',
};
const floor = `<rect x="2" y="56" width="92" height="5" rx="1.5" fill="${V.dk}"/>`;
const bricks = (x: number, y: number, w: number, h: number) => {
  let d = '';
  for (let yy = y + 6; yy < y + h; yy += 6) d += `M${x} ${yy}h${w}`;
  for (let yy = y, row = 0; yy < y + h; yy += 6, row++) for (let xx = x + (row % 2 ? 6 : 0); xx < x + w; xx += 12) d += `M${xx} ${yy}v6`;
  return `<path d="${d}" stroke="${V.brickDk}" stroke-width="1" opacity=".7"/>`;
};

// ---------------------------------------------------------------- main floor
export const furnace = () => `${floor}
<rect x="22" y="24" width="52" height="32" rx="2" fill="${V.brick}"/>${bricks(22, 24, 52, 32)}
<rect x="22" y="22" width="52" height="4" fill="${V.brickDk}"/>
<rect x="30" y="4" width="12" height="20" fill="${V.steel}"/><rect x="27" y="2" width="18" height="4" rx="1" fill="${V.dk}"/><rect x="30" y="9" width="12" height="2" fill="${V.dk}"/>
<g class="m-smoke"><circle cx="36" cy="0" r="4" fill="${V.smoke}"/></g><g class="m-smoke run-only" style="animation-delay:-1.3s"><circle cx="38" cy="0" r="3.5" fill="${V.smoke}"/></g>
<path d="M36 52 V38 A12 12 0 0 1 60 38 V52Z" fill="${V.ink}"/>
<path class="m-glow" d="M39 52 V39 A9 9 0 0 1 57 39 V52Z" fill="${V.ember}"/>
<rect x="36" y="52" width="24" height="3" fill="${V.dk}"/>
<path d="M76 40 L90 34 L90 46Z" fill="${V.copper}"/><rect x="74" y="36" width="4" height="8" fill="${V.dk}"/>`;

export const blastFurnace = () => `${floor}
<path d="M36 56 L32 34 L38 14 L58 14 L64 34 L60 56Z" fill="${V.steel}"/>
<path d="M32 34h32M34 24h28M35 44h26" stroke="${V.dk}" stroke-width="1.5"/>
<rect x="40" y="4" width="16" height="11" fill="${V.dk}"/><rect x="43" y="0" width="10" height="5" fill="${V.dk}"/>
<path d="M40 8 C24 8 20 14 20 24 L20 44" stroke="${V.copper}" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M56 8 C72 8 76 14 76 24 L76 44" stroke="${V.copper}" stroke-width="5" fill="none" stroke-linecap="round"/>
<rect x="16" y="44" width="8" height="8" rx="2" fill="${V.dk}"/><rect x="72" y="44" width="8" height="8" rx="2" fill="${V.dk}"/>
<path d="M24 48 L32 48 M64 48 L72 48" stroke="${V.dk}" stroke-width="3"/>
<rect class="m-glow" x="45" y="30" width="6" height="8" rx="1" fill="${V.ember}"/>
<g class="m-smoke" style="animation-duration:3s"><circle cx="48" cy="-2" r="4" fill="${V.smoke}"/></g>
<path class="m-pour run-only" d="M60 50 L82 56 L82 58 L60 54Z" fill="${V.ember}"/><rect x="58" y="48" width="6" height="6" fill="${V.dk}"/>`;
export const forgeWorks = () => `${floor}
<rect x="10" y="30" width="40" height="26" rx="2" fill="${V.brick}"/>${bricks(10, 30, 40, 26)}
<path d="M8 30 L52 30 L44 16 L16 16Z" fill="${V.dk}"/><rect x="24" y="2" width="12" height="15" fill="${V.steel}"/>
<rect class="m-glow" x="18" y="38" width="24" height="14" rx="1" fill="${V.ember}"/>
<rect x="56" y="46" width="34" height="6" rx="1" fill="${V.dk}"/><path d="M58 46 L88 46 L84 38 L64 38Z" fill="${V.steel}"/><path d="M84 38 L94 40 L92 44 L84 42Z" fill="${V.steel}"/>
<rect x="68" y="52" width="10" height="5" fill="${V.dk}"/>
<g class="m-hammer" style="--ox:80px;--oy:38px"><rect x="78" y="14" width="4" height="24" fill="${V.dk}"/><rect x="70" y="10" width="20" height="9" rx="2" fill="${V.lt}"/></g>
<g class="run-only"><circle class="m-spark" style="--dx:-8px;--dy:-10px" cx="76" cy="38" r="1.2" fill="${V.flame}"/><circle class="m-spark" style="--dx:7px;--dy:-12px;animation-delay:.2s" cx="78" cy="38" r="1" fill="#FFD98A"/><circle class="m-spark" style="--dx:-2px;--dy:-14px;animation-delay:.4s" cx="77" cy="38" r="1.1" fill="${V.ember}"/></g>
<rect x="54" y="30" width="8" height="12" fill="${V.dk}"/><rect x="53" y="28" width="10" height="3" fill="${V.steel}"/>`;

export const crusher = () => `${floor}
<path d="M28 20 L68 20 L60 32 L36 32Z" fill="${V.dk}"/><path d="M30 20 L66 20 L64 16 L32 16Z" fill="${V.steel}"/>
<rect x="34" y="32" width="28" height="20" rx="2" fill="${V.steel}"/>
<g class="m-shake run-only-anim"><path d="M40 34 L56 34 L60 50 L36 50Z" fill="${V.dk}"/><path d="M42 36 L54 36 L57 48 L39 48Z" fill="${V.ink}"/></g>
<g class="m-spin" style="--ox:76px;--oy:40px"><circle cx="76" cy="40" r="12" fill="${V.dk}"/><circle cx="76" cy="40" r="9" fill="${V.steel}"/><path d="M76 31v18M67 40h18M70 34l12 12M82 34l-12 12" stroke="${V.dk}" stroke-width="2"/><circle cx="76" cy="40" r="2.5" fill="${V.hazard}"/></g>
<rect x="62" y="38" width="8" height="4" fill="${V.dk}"/>
<rect x="34" y="52" width="28" height="4" fill="${V.dk}"/>
<circle cx="18" cy="52" r="3" fill="${V.smoke}"/><circle cx="24" cy="54" r="2.5" fill="${V.smoke}"/><circle cx="14" cy="55" r="2" fill="${V.smoke}"/>`;

export const hydraulicCrusher = () => `${floor}
<path d="M28 24 L68 24 L60 34 L36 34Z" fill="${V.dk}"/><path d="M30 24 L66 24 L64 20 L32 20Z" fill="${V.steel}"/>
<rect x="34" y="34" width="28" height="18" rx="2" fill="${V.steel}"/>
<g class="m-shake run-only-anim"><path d="M40 36 L56 36 L60 50 L36 50Z" fill="${V.dk}"/><path d="M42 38 L54 38 L57 48 L39 48Z" fill="${V.ink}"/></g>
<rect x="34" y="52" width="28" height="4" fill="${V.dk}"/>
<rect x="30" y="2" width="12" height="18" rx="2" fill="${V.dk}"/><rect x="33" y="5" width="6" height="12" rx="1" fill="${V.glass}"/><rect class="m-piston" x="34" y="13" width="4" height="8" fill="${V.lt}"/>
<rect x="54" y="2" width="12" height="18" rx="2" fill="${V.dk}"/><rect x="57" y="5" width="6" height="12" rx="1" fill="${V.glass}"/><rect class="m-piston" style="animation-delay:-.6s" x="58" y="13" width="4" height="8" fill="${V.lt}"/>
<rect x="66" y="34" width="18" height="10" rx="2" fill="${V.dk}"/><rect x="68" y="36" width="14" height="6" rx="1" fill="${V.glass}"/>
<path d="M66 8 L84 8 L84 34" stroke="${V.ink}" stroke-width="3" fill="none"/><path d="M42 8 L54 8" stroke="${V.ink}" stroke-width="3"/>
<path d="M84 34 L90 34" stroke="${V.ink}" stroke-width="3"/>
<circle cx="18" cy="30" r="7" fill="${V.lt}"/><circle cx="18" cy="30" r="5" fill="${V.bg}"/><path class="m-needle run-only-anim" style="--ox:18px;--oy:30px" d="M18 30 L21 26" stroke="${V.hazard}" stroke-width="1.5"/><path d="M18 34 L18 52" stroke="${V.ink}" stroke-width="2"/>
<circle cx="14" cy="55" r="2" fill="${V.smoke}"/><circle cx="26" cy="55" r="2.4" fill="${V.smoke}"/>`;
export const siftingCrusher = () => crusher().replace(`<circle cx="18" cy="52" r="3" fill="${V.smoke}"/><circle cx="24" cy="54" r="2.5" fill="${V.smoke}"/><circle cx="14" cy="55" r="2" fill="${V.smoke}"/>`,
  `<g class="m-sift"><path d="M34 44 L6 50 L8 54 L34 48Z" fill="${V.copper}"/><path d="M12 48l2-2M18 47l2-2M24 46l2-2" stroke="${V.dk}" stroke-width="1"/></g><circle class="m-fall run-only" cx="8" cy="42" r="2" fill="#B8703F"/><circle class="m-fall run-only" style="animation-delay:-.5s" cx="14" cy="40" r="1.6" fill="#B8703F"/><circle cx="4" cy="55" r="2.2" fill="${V.smoke}"/><circle cx="10" cy="56" r="1.8" fill="${V.smoke}"/>`);

export const cokeOven = () => `${floor}
<path d="M16 56 C16 30 30 16 48 16 C66 16 80 30 80 56Z" fill="${V.brick}"/>
<path d="M22 56 C22 34 34 22 48 22 C62 22 74 34 74 56Z" fill="none" stroke="${V.brickDk}" stroke-width="1"/><path d="M30 56 C30 40 38 30 48 30 C58 30 66 40 66 56Z" fill="none" stroke="${V.brickDk}" stroke-width="1"/>
<path d="M40 56 V44 A8 8 0 0 1 56 44 V56Z" fill="${V.ink}"/><path class="m-glow" d="M43 56 V45 A5 5 0 0 1 53 45 V56Z" fill="${V.ember}"/>
<rect x="42" y="6" width="12" height="12" fill="${V.steel}"/><rect x="40" y="4" width="16" height="3" fill="${V.dk}"/>
<g class="m-smoke"><circle cx="48" cy="2" r="4" fill="${V.smoke}"/></g><g class="m-smoke run-only" style="animation-delay:-1.4s"><circle cx="50" cy="2" r="3" fill="${V.smoke}"/></g>
<rect x="36" y="54" width="24" height="3" fill="${V.dk}"/>`;

export const industrialCoker = () => `${floor}
<path d="M6 56 C6 34 16 24 30 24 C44 24 54 34 54 56Z" fill="${V.brick}"/>
<path d="M42 56 C42 34 52 24 66 24 C80 24 90 34 90 56Z" fill="${V.brick}"/>
<path d="M12 56 C12 40 20 32 30 32 C40 32 48 40 48 56Z M48 56 C48 40 56 32 66 32 C76 32 84 40 84 56Z" fill="none" stroke="${V.brickDk}" stroke-width="1"/>
<rect x="4" y="38" width="88" height="4" fill="${V.dk}"/><rect x="4" y="48" width="88" height="3" fill="${V.dk}"/>
<path d="M24 56 V46 A6 6 0 0 1 36 46 V56Z M60 56 V46 A6 6 0 0 1 72 46 V56Z" fill="${V.ink}"/><path class="m-glow" d="M26 56 V47 A4 4 0 0 1 34 47 V56Z M62 56 V47 A4 4 0 0 1 70 47 V56Z" fill="${V.ember}"/>
<rect x="44" y="2" width="10" height="26" fill="${V.steel}"/><rect x="41" y="0" width="16" height="4" fill="${V.dk}"/><rect x="44" y="8" width="10" height="2" fill="${V.dk}"/>
<g class="m-smoke" style="animation-duration:2.6s"><circle cx="49" cy="-2" r="5" fill="${V.smoke}"/></g><g class="m-smoke run-only" style="animation-delay:-1.3s;animation-duration:2.6s"><circle cx="51" cy="-2" r="4" fill="${V.smoke}"/></g>
<path d="M34 24 L44 20 M62 24 L54 20" stroke="${V.dk}" stroke-width="4"/>
<rect x="2" y="16" width="60" height="3" fill="${V.dk}"/><g class="m-slide run-only-anim"><rect x="8" y="10" width="14" height="7" rx="1" fill="${V.copper}"/><circle cx="11" cy="19" r="2" fill="${V.dk}"/><circle cx="19" cy="19" r="2" fill="${V.dk}"/></g>`;
export const byproductCoker = () => cokeOven().replace(floor, `${floor}
<rect x="76" y="20" width="16" height="30" rx="4" fill="${V.dk}"/><rect x="78" y="22" width="12" height="26" rx="3" fill="${V.steel}"/>
<path d="M56 18 L76 18 L80 24" stroke="${V.copper}" stroke-width="3" fill="none"/>
<rect x="80" y="30" width="8" height="12" rx="1" fill="${V.ink}"/><path d="M84 50 v4" stroke="${V.ink}" stroke-width="3"/><circle class="m-drip run-only" cx="84" cy="50" r="2" fill="${V.ink}"/>`);

export const munitionsPress = () => `${floor}
<rect x="24" y="50" width="48" height="6" rx="1" fill="${V.dk}"/>
<rect x="28" y="8" width="8" height="44" fill="${V.steel}"/><rect x="60" y="8" width="8" height="44" fill="${V.steel}"/>
<rect x="24" y="6" width="48" height="8" rx="1" fill="${V.dk}"/>
<g class="m-ram"><rect x="44" y="14" width="8" height="12" fill="${V.lt}"/><rect x="38" y="26" width="20" height="8" rx="1" fill="${V.dk}"/></g>
<rect x="40" y="42" width="16" height="6" rx="1" fill="${V.copper}"/>
<g class="m-shimmer run-only-anim">${[76, 82, 88].map(x => `<rect x="${x}" y="40" width="4" height="12" rx="1" fill="${V.brass}"/><rect x="${x}" y="40" width="4" height="3" fill="${V.copper}"/>`).join('')}</g>
<rect x="74" y="52" width="20" height="4" fill="${V.dk}"/>
<rect x="8" y="30" width="14" height="22" rx="1" fill="${V.dk}"/><rect x="10" y="34" width="10" height="4" fill="${V.lt}"/><rect x="10" y="42" width="10" height="4" fill="${V.lt}"/>`;

export const heavyPress = () => munitionsPress()
  .replace(`<rect x="24" y="6" width="48" height="8" rx="1" fill="${V.dk}"/>`, `<rect x="20" y="4" width="56" height="10" rx="1" fill="${V.dk}"/><rect x="20" y="4" width="56" height="3" fill="${V.hazard}"/>`)
  .replace(`<rect x="44" y="14" width="8" height="12" fill="${V.lt}"/>`, `<rect x="42" y="14" width="12" height="12" fill="${V.lt}"/><g class="m-spin" style="--ox:14px;--oy:18px"><circle cx="14" cy="18" r="9" fill="${V.dk}"/><circle cx="14" cy="18" r="6" fill="${V.steel}"/><path d="M14 9v18M5 18h18" stroke="${V.lt}" stroke-width="1.5"/><circle cx="14" cy="18" r="2" fill="${V.hazard}"/></g>`);

// ---------------------------------------------------------------- workshop
export const chemicalWorks = () => `${floor}
<circle cx="22" cy="30" r="14" fill="${V.lt}"/><circle cx="22" cy="30" r="14" fill="none" stroke="${V.dk}" stroke-width="1.5"/><path d="M8 30h28" stroke="${V.dk}" stroke-width="1.2"/><path d="M14 44 L12 56 M30 44 L32 56" stroke="${V.dk}" stroke-width="3"/>
<circle cx="74" cy="34" r="11" fill="${V.lt}"/><circle cx="74" cy="34" r="11" fill="none" stroke="${V.dk}" stroke-width="1.5"/><path d="M66 45 L64 56 M82 45 L84 56" stroke="${V.dk}" stroke-width="3"/>
<rect x="42" y="22" width="16" height="34" rx="3" fill="${V.dk}"/><rect x="45" y="26" width="10" height="26" rx="2" fill="${V.green}"/><rect x="45" y="26" width="10" height="9" fill="${V.bg}" opacity=".6"/>
<g class="m-bubble"><circle cx="48" cy="50" r="1.4" fill="#fff" opacity=".7"/></g><g class="m-bubble run-only" style="animation-delay:-.9s"><circle cx="52" cy="50" r="1.1" fill="#fff" opacity=".7"/></g>
<g class="m-spin run-only-anim" style="--ox:50px;--oy:20px;animation-duration:5s"><circle cx="50" cy="20" r="6" fill="${V.dk}"/><path d="M46 20h8M50 16v8" stroke="${V.lt}" stroke-width="1.5"/></g>
<path d="M36 30 L42 30 M58 34 L63 34 M22 16 L22 8 L50 8 L50 14" stroke="${V.copper}" stroke-width="3" fill="none"/>
<rect x="18" y="4" width="8" height="5" rx="1" fill="${V.hazard}"/>
<path d="M2 56 L94 56" stroke="${V.hazard}" stroke-width="1" stroke-dasharray="6 4" opacity=".7"/>`;
export const refinery = () => `${floor}
<rect x="10" y="6" width="12" height="50" rx="3" fill="${V.lt}"/>${[14, 24, 34, 44].map(y => `<rect x="8" y="${y}" width="16" height="2" fill="${V.dk}"/>`).join('')}
<rect x="28" y="18" width="10" height="38" rx="3" fill="${V.lt}"/>${[26, 36, 46].map(y => `<rect x="26" y="${y}" width="14" height="2" fill="${V.dk}"/>`).join('')}
<rect x="46" y="36" width="30" height="20" rx="7" fill="${V.steel}"/><rect x="46" y="36" width="30" height="4" fill="${V.dk}"/>
<rect x="66" y="14" width="3" height="22" fill="${V.dk}"/><g class="m-flame" style="--ox:67.5px;--oy:14px"><path d="M67.5 14 C63 8 65 3 67.5 1 C70 4 72 8 67.5 14Z" fill="${V.flame}"/><path d="M67.5 14 C65.5 11 66.5 8 67.5 7 C68.5 9 69.5 11 67.5 14Z" fill="#FFD98A"/></g>
<rect x="86" y="8" width="3" height="28" fill="${V.dk}"/><path class="m-flame run-only" style="--ox:87.5px;--oy:8px;animation-delay:-.4s" d="M87.5 8 C83 3 85 -1 87.5 -3 C90 0 92 3 87.5 8Z" fill="${V.flame}" opacity=".9"/>
<path d="M22 12 L28 12 M38 26 L46 26 L46 36 M56 36 L56 28 L66 28 M76 44 L86 44 L86 36 M10 46 L4 46 L4 56" stroke="${V.copper}" stroke-width="2.5" fill="none"/>
<circle cx="46" cy="26" r="2.5" fill="${V.hazard}"/><circle cx="86" cy="44" r="2.5" fill="${V.hazard}"/>
<rect x="14" y="50" width="4" height="4" fill="${V.ember}"/>`;
export const lapidary = () => `${floor}
<rect x="10" y="44" width="76" height="6" rx="1" fill="${V.copper}"/><rect x="14" y="50" width="6" height="6" fill="${V.dk}"/><rect x="76" y="50" width="6" height="6" fill="${V.dk}"/>
<g class="m-spin" style="--ox:34px;--oy:34px"><circle cx="34" cy="34" r="12" fill="${V.dk}"/><circle cx="34" cy="34" r="9" fill="${V.lt}"/><path d="M34 25v18M25 34h18" stroke="${V.dk}" stroke-width="1.2"/><circle cx="34" cy="34" r="2" fill="${V.dk}"/></g>
<rect x="18" y="42" width="32" height="3" fill="${V.dk}"/>
<path d="M60 16 L74 30 L60 44 L46 30Z" fill="${V.glass}"/><path class="m-sparkle run-only" d="M60 16 L74 30 L60 30Z" fill="#fff" opacity=".45"/><path d="M60 30 L60 44 L46 30Z" fill="#000" opacity=".2"/>
<rect x="58" y="6" width="4" height="10" fill="${V.dk}"/><rect x="54" y="4" width="12" height="4" rx="1" fill="${V.steel}"/>
<path d="M82 42 L82 18 L72 8" stroke="${V.dk}" stroke-width="3" fill="none"/><circle cx="70" cy="8" r="5" fill="${V.hazard}"/>`;

export const foundry = () => `${floor}
<rect x="6" y="26" width="28" height="30" rx="2" fill="${V.brick}"/>${bricks(6, 26, 28, 30)}
<path class="m-glow" d="M12 44 V36 A8 8 0 0 1 28 36 V44Z" fill="${V.ember}"/><rect x="12" y="44" width="16" height="2" fill="${V.dk}"/>
<rect x="34" y="4" width="4" height="30" fill="${V.dk}"/><rect x="34" y="4" width="46" height="4" fill="${V.dk}"/><rect x="60" y="8" width="3" height="10" fill="${V.dk}"/>
<g class="m-tilt" style="--ox:62px;--oy:30px"><path d="M50 22 L74 22 L70 40 L54 40Z" fill="${V.dk}"/><path d="M52 24 L72 24 L70 30 L54 30Z" fill="${V.ember}"/><rect x="48" y="18" width="28" height="4" rx="1" fill="${V.steel}"/><rect x="74" y="19" width="6" height="3" fill="${V.steel}"/></g>
<path class="m-pour run-only" d="M78 36 C80 40 80 44 80 46" stroke="${V.ember}" stroke-width="4" stroke-linecap="round"/>
${[64, 74, 84].map(x => `<path d="M${x - 5} 46 L${x + 5} 46 L${x + 4} 54 L${x - 4} 54Z" fill="${V.steel}"/><rect x="${x - 3}" y="47" width="6" height="3" fill="${x === 84 ? V.ember : x === 74 ? '#9AA7B5' : V.dk}"/>`).join('')}
<rect x="56" y="54" width="36" height="3" fill="${V.dk}"/>
<rect x="40" y="46" width="8" height="10" fill="${V.dk}"/><rect x="38" y="44" width="12" height="3" fill="${V.steel}"/>`;
export const machineShop = () => `${floor}
<rect x="6" y="40" width="84" height="8" rx="1" fill="${V.dk}"/><rect x="10" y="48" width="8" height="8" fill="${V.dk}"/><rect x="78" y="48" width="8" height="8" fill="${V.dk}"/>
<rect x="10" y="20" width="20" height="20" rx="2" fill="${V.steel}"/><g class="m-spin" style="--ox:34px;--oy:32px;animation-duration:1.2s"><circle cx="34" cy="32" r="8" fill="${V.lt}"/><circle cx="34" cy="32" r="3" fill="${V.dk}"/><path d="M34 24v16M26 32h16" stroke="${V.dk}" stroke-width="1.5"/></g>
<rect x="42" y="30" width="30" height="4" fill="${V.lt}"/>
<g class="m-carriage run-only-anim"><rect x="48" y="34" width="12" height="8" fill="${V.steel}"/><rect x="50" y="24" width="8" height="10" fill="${V.dk}"/></g>
<rect x="72" y="26" width="10" height="14" rx="1" fill="${V.steel}"/><rect x="82" y="30" width="8" height="4" fill="${V.dk}"/>
<circle cx="20" cy="30" r="3" fill="${V.hazard}"/>
<rect x="6" y="6" width="30" height="10" rx="1" fill="${V.dk}"/>${[10, 16, 22, 28].map(x => `<rect x="${x}" y="8" width="3" height="6" fill="${V.lt}"/>`).join('')}`;

export const jeweler = () => `${floor}
<rect x="12" y="30" width="72" height="26" rx="2" fill="${V.copper}"/><rect x="12" y="30" width="72" height="4" fill="${V.dk}"/>
<rect x="18" y="36" width="60" height="16" rx="2" fill="${V.glass}" opacity=".9"/><rect x="18" y="36" width="60" height="6" fill="#fff" opacity=".15"/>
<circle cx="48" cy="45" r="5" fill="none" stroke="${V.hazard}" stroke-width="2.5"/><path class="m-sparkle" d="M48 37 L51 40 L48 42 L45 40Z" fill="#fff"/>
<circle cx="30" cy="45" r="3" fill="none" stroke="${V.lt}" stroke-width="2"/><circle cx="66" cy="45" r="3" fill="none" stroke="${V.hazard}" stroke-width="2"/>
<path d="M78 30 L78 12 L64 6" stroke="${V.dk}" stroke-width="2.5" fill="none"/><path d="M58 4 L70 4 L66 12 L62 12Z" fill="${V.hazard}"/><path class="m-cone run-only" d="M62 12 L66 12 L74 34 L54 34Z" fill="${V.hazard}" opacity=".12"/>
<rect x="20" y="20" width="14" height="8" rx="1" fill="${V.dk}"/><rect x="22" y="22" width="10" height="4" fill="${V.lt}"/>`;

export const armory = () => `${floor}
<rect x="6" y="42" width="84" height="7" rx="1" fill="${V.copper}"/><rect x="10" y="49" width="6" height="7" fill="${V.dk}"/><rect x="80" y="49" width="6" height="7" fill="${V.dk}"/>
<path d="M32 42 L32 30 L26 30 L26 24 L42 24 L42 30 L36 30 L36 42Z" fill="${V.dk}"/>
<path d="M22 24 L46 24 L52 16 L16 16Z" fill="${V.steel}"/><path d="M16 16 L52 16 L48 12 L20 12Z" fill="${V.lt}"/>
<g class="m-hammer run-only-anim" style="--ox:44px;--oy:14px"><rect x="42" y="0" width="3" height="14" fill="${V.dk}"/><rect x="37" y="-3" width="13" height="6" rx="1" fill="${V.lt}"/></g>
<path d="M60 42 L60 26 L66 20 L78 20 L84 26 L84 42Z" fill="${V.lt}"/><path d="M64 42 L64 28 L68 24 L76 24 L80 28 L80 42Z" fill="${V.steel}"/><rect x="70" y="28" width="4" height="10" fill="${V.hazard}"/>
<path d="M88 42 L88 14 L74 6" stroke="${V.dk}" stroke-width="2.5" fill="none"/><path d="M68 4 L80 4 L76 12 L72 12Z" fill="${V.hazard}"/><path class="m-cone" d="M72 12 L76 12 L86 40 L62 40Z" fill="${V.hazard}" opacity=".12"/>
<g class="run-only"><circle class="m-spark" style="--dx:-6px;--dy:-9px" cx="34" cy="24" r="1.2" fill="${V.flame}"/><circle class="m-spark" style="--dx:6px;--dy:-10px;animation-delay:.25s" cx="34" cy="24" r="1" fill="#FFD98A"/></g>
<rect x="8" y="34" width="10" height="8" rx="1" fill="${V.dk}"/><rect x="6" y="32" width="14" height="3" fill="${V.steel}"/>`;
export const solarPanel = () => `${floor}
<path d="M14 44 L28 16 L82 16 L68 44Z" fill="${V.glass}"/><path d="M14 44 L28 16 L82 16 L68 44Z" fill="none" stroke="${V.dk}" stroke-width="2"/>
<path d="M21 30 L75 30 M42 16 L28 44 M55 16 L41 44 M68 16 L54 44" stroke="${V.dk}" stroke-width="1.5"/>
<rect x="40" y="44" width="6" height="12" fill="${V.steel}"/><rect x="34" y="52" width="18" height="4" fill="${V.dk}"/>
<rect x="60" y="46" width="12" height="8" rx="1" fill="${V.dk}"/><circle class="m-led" cx="66" cy="50" r="2" fill="${V.green}"/><path class="m-glint run-only" d="M30 18 L36 18 L24 42 L18 42Z" fill="#fff" opacity=".25"/>`;

export const MACHINES: Array<{ id: string; name: string; draw: () => string; motion: string }> = [
  { id: 'furnace', name: 'Furnace', draw: furnace, motion: 'chimney smoke' },
  { id: 'furnace:blast', name: 'Blast Furnace', draw: blastFurnace, motion: 'tap-hole pour' },
  { id: 'furnace:forge', name: 'Forge Works', draw: forgeWorks, motion: 'hammer blow' },
  { id: 'crusher', name: 'Crusher', draw: crusher, motion: 'flywheel turn' },
  { id: 'crusher:hydraulic', name: 'Hydraulic Crusher', draw: hydraulicCrusher, motion: 'cylinder stroke' },
  { id: 'crusher:sifting', name: 'Sifting Crusher', draw: siftingCrusher, motion: 'screen shake' },
  { id: 'coke_oven', name: 'Coke Oven', draw: cokeOven, motion: 'chimney smoke' },
  { id: 'coke_oven:industrial', name: 'Industrial Coker', draw: industrialCoker, motion: 'stack smoke' },
  { id: 'coke_oven:byproduct', name: 'Byproduct Coker', draw: byproductCoker, motion: 'tar drip' },
  { id: 'munitions_press', name: 'Munitions Press', draw: munitionsPress, motion: 'ram stroke' },
  { id: 'munitions_press:heavy', name: 'Heavy Press', draw: heavyPress, motion: 'flywheel + ram' },
  { id: 'chemical_works', name: 'Chemical Works', draw: chemicalWorks, motion: 'bubbles in column' },
  { id: 'refinery', name: 'Refinery', draw: refinery, motion: 'flare' },
  { id: 'lapidary', name: 'Lapidary', draw: lapidary, motion: 'wheel spin' },
  { id: 'foundry', name: 'Foundry', draw: foundry, motion: 'crucible tilt' },
  { id: 'machine_shop', name: 'Machine Shop', draw: machineShop, motion: 'chuck spin' },
  { id: 'jeweler', name: 'Jeweler', draw: jeweler, motion: 'gem sparkle' },
  { id: 'armory', name: 'Gearsmith (was Armory)', draw: armory, motion: 'lamp / torch flicker' },
  { id: 'solar_panel', name: 'Solar Panel', draw: solarPanel, motion: 'status LED' },
];
