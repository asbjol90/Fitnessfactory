import type { RaiderType, TurretId } from '../engine';

export const CELL = 52;

/** Field cell background. */
export const fieldCell = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="var(--dirt)"/><circle cx="${x + 12}" cy="${y + 40}" r="1.5" fill="var(--dirt-2)"/><circle cx="${x + 38}" cy="${y + 14}" r="2" fill="var(--dirt-2)"/>`;
/** Road cell: packed earth with wheel ruts. */
export const roadCell = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="var(--road)"/><path d="M${x + 4} ${y + 18}h${CELL - 8}M${x + 4} ${y + 34}h${CELL - 8}" stroke="var(--road-rut)" stroke-width="2" stroke-dasharray="6 5"/>`;
/** Wall cell: brick from above. */
export const wallCell = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="url(#p-brick)"/><rect x="${x}" y="${y}" width="${CELL}" height="6" fill="var(--wall-top)"/>`;
export const gateCell = (x: number, y: number, hpFrac: number) =>
  `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="url(#p-brick)"/><rect x="${x + 8}" y="${y + 4}" width="${CELL - 16}" height="${CELL - 8}" rx="3" fill="var(--steel-dk)"/>` +
  `<rect x="${x + 8}" y="${y + 4}" width="${CELL - 16}" height="4" fill="url(#p-hazard)"/><rect x="${x + 8}" y="${y + CELL - 8}" width="${CELL - 16}" height="4" fill="url(#p-hazard)"/>` +
  `<path d="M${x + CELL / 2} ${y + 8}v${CELL - 16}" stroke="var(--steel)" stroke-width="2"/>` +
  (hpFrac >= 0 ? `<rect x="${x + 10}" y="${y + CELL / 2 - 3}" width="${CELL - 20}" height="6" fill="var(--bg)"/><rect x="${x + 10}" y="${y + CELL / 2 - 3}" width="${(CELL - 20) * Math.max(0, hpFrac)}" height="6" fill="var(--ok)"/>` : '');

export const placeableMark = (x: number, y: number, on: boolean) =>
  `<rect x="${x + 4}" y="${y + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="6" fill="${on ? 'var(--hazard)' : 'none'}" fill-opacity=".14" stroke="var(--${on ? 'hazard' : 'floor-mark'})" stroke-width="1.5" stroke-dasharray="4 4"/>`;
export const rangeMark = (x: number, y: number) =>
  `<rect x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="4" fill="var(--cardio)" fill-opacity=".14"/>`;

export const barricade = (x: number, y: number, hpFrac: number) =>
  `<g transform="translate(${x},${y})"><rect x="8" y="14" width="36" height="24" rx="3" fill="var(--wall-mortar)"/><path d="M10 26h32M18 16v20M34 16v20" stroke="var(--copper)" stroke-width="3"/><path d="M6 12l40 28M46 12L6 40" stroke="var(--brick-dk)" stroke-width="4"/>` +
  `<rect x="10" y="42" width="32" height="4" fill="var(--bg)"/><rect x="10" y="42" width="${32 * Math.max(0, hpFrac)}" height="4" fill="var(--hazard)"/></g>`;

/** Turret from above: base ring + a barrel group that the screen rotates. */
export function turretTop(id: TurretId, x: number, y: number, angleDeg: number, spinning: boolean): string {
  const cx = x + CELL / 2, cy = y + CELL / 2;
  const barrel = (() => {
    switch (id) {
      case 'scrap_launcher': return `<path d="M-4 -6 L18 -3 L18 3 L-4 6Z" fill="var(--brick)"/><rect x="14" y="-6" width="6" height="12" rx="1" fill="var(--brick-dk)"/>`;
      case 'shotgun': return `<rect x="-2" y="-6" width="20" height="4" rx="1" fill="var(--steel-lt)"/><rect x="-2" y="2" width="20" height="4" rx="1" fill="var(--steel-lt)"/><rect x="-6" y="-7" width="8" height="14" rx="2" fill="var(--steel-dk)"/>`;
      case 'assault_rifle': return `<rect x="-2" y="-3" width="24" height="5" rx="1" fill="var(--steel-lt)"/><rect x="10" y="-5" width="6" height="9" fill="var(--steel-dk)"/><rect x="-7" y="-6" width="9" height="12" rx="2" fill="var(--steel-dk)"/><rect x="-4" y="-9" width="5" height="4" fill="var(--hazard)"/>`;
      case 'minigun': return `<rect x="2" y="-5" width="20" height="3" fill="var(--steel-lt)"/><rect x="2" y="-1" width="20" height="3" fill="var(--steel-lt)"/><rect x="2" y="3" width="20" height="3" fill="var(--steel-lt)"/><g class="${spinning ? 'anim-spin' : ''}" style="transform-origin:0px 0px"><circle r="6" fill="var(--steel-dk)"/><circle cx="0" cy="-4" r="1.5" fill="var(--steel-lt)"/><circle cx="0" cy="4" r="1.5" fill="var(--steel-lt)"/></g>`;
      case 'double_minigun': return `<rect x="2" y="-9" width="22" height="3" fill="var(--hazard)"/><rect x="2" y="-5" width="22" height="3" fill="var(--steel-lt)"/><rect x="2" y="2" width="22" height="3" fill="var(--hazard)"/><rect x="2" y="6" width="22" height="3" fill="var(--steel-lt)"/><g class="${spinning ? 'anim-spin' : ''}" style="transform-origin:0px -5px"><circle cy="-5" r="5" fill="var(--steel-dk)"/></g><g class="${spinning ? 'anim-spin' : ''}" style="transform-origin:0px 5px"><circle cy="5" r="5" fill="var(--steel-dk)"/></g>`;
    }
  })();
  return `<g transform="translate(${cx},${cy})"><circle r="19" fill="var(--pad)" stroke="var(--pad-edge)"/><circle r="15" fill="var(--steel-dk)"/><circle r="12" fill="var(--steel)"/>` +
    `<g class="barrel" style="transform:rotate(${angleDeg}deg);transition:transform .35s ease-out">${barrel}<g class="muzzle" transform="translate(22,0)"><path d="M0 0 L9 -5 L6 0 L9 5Z" fill="var(--flame)" opacity="0"/></g></g></g>`;
}

/** Raider from above, facing down the road. */
export function raiderTop(type: RaiderType, x: number, y: number, hpFrac: number): string {
  const body = (() => {
    switch (type) {
      case 'scrapper': return `<circle r="9" fill="#7A3A2E"/><circle r="6" fill="#C98B5A"/><rect x="-9" y="-3" width="18" height="4" fill="#3A2A20"/><rect x="8" y="-2" width="10" height="3" fill="var(--steel-dk)"/>`;
      case 'runner': return `<ellipse rx="7" ry="10" fill="#4A4A55"/><circle r="5" fill="#E0AC85"/><path d="M-9 -8 L-13 -14 M9 -8 L13 -14" stroke="#4A4A55" stroke-width="3"/>`;
      case 'brute': return `<rect x="-13" y="-13" width="26" height="26" rx="6" fill="#2E3A2A"/><circle r="8" fill="#8D5A3C"/><rect x="-8" y="-9" width="16" height="5" fill="var(--steel-dk)"/><rect x="10" y="-4" width="12" height="6" fill="var(--steel-dk)"/>`;
    }
  })();
  const w = type === 'brute' ? 30 : 20;
  return `<g transform="translate(${x},${y})"><ellipse cy="12" rx="${w / 2}" ry="4" fill="#000" opacity=".35"/>${body}` +
    `<rect x="${-w / 2}" y="${-w / 2 - 8}" width="${w}" height="3" fill="var(--bg)"/><rect x="${-w / 2}" y="${-w / 2 - 8}" width="${w * Math.max(0, hpFrac)}" height="3" fill="var(--danger)"/></g>`;
}

export const raiderBlurbIcon = (type: RaiderType) => `<svg width="28" height="28" viewBox="-14 -14 28 28">${raiderTop(type, 0, 0, 1).replace(/<rect x="-\d+" y="-\d+\.?\d*" width="\d+" height="3"[^>]*\/>/g, '')}</svg>`;
