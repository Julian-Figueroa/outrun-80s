export type SpriteKind =
  | 'palmL'
  | 'palmR'
  | 'lampL'
  | 'lampR'
  | 'billboardA'
  | 'billboardB'
  | 'billboardC'
  | 'cactus'
  | 'gantryStart'
  | 'gantryCheckpoint'
  | 'gantryGoal'
  | 'carCoupe'
  | 'carSedan'
  | 'carVan'
  | 'carTruck'
  | 'player'
  | 'playerBrake';

export interface SpriteDef {
  /** design width/height; screen size is derived from these via SPRITE_SCALE */
  w: number;
  h: number;
  /** offscreen canvas pixels per design unit */
  res: number;
  collide: boolean;
}

export const SPRITE_DEFS: Record<SpriteKind, SpriteDef> = {
  palmL: { w: 150, h: 380, res: 2, collide: true },
  palmR: { w: 150, h: 380, res: 2, collide: true },
  lampL: { w: 110, h: 340, res: 2, collide: true },
  lampR: { w: 110, h: 340, res: 2, collide: true },
  billboardA: { w: 300, h: 230, res: 2, collide: true },
  billboardB: { w: 300, h: 230, res: 2, collide: true },
  billboardC: { w: 300, h: 230, res: 2, collide: true },
  cactus: { w: 110, h: 220, res: 2, collide: true },
  gantryStart: { w: 640, h: 270, res: 2, collide: false },
  gantryCheckpoint: { w: 640, h: 270, res: 2, collide: false },
  gantryGoal: { w: 640, h: 270, res: 2, collide: false },
  carCoupe: { w: 80, h: 42, res: 5, collide: true },
  carSedan: { w: 84, h: 50, res: 5, collide: true },
  carVan: { w: 88, h: 66, res: 5, collide: true },
  carTruck: { w: 100, h: 86, res: 5, collide: true },
  player: { w: 80, h: 44, res: 5, collide: true },
  playerBrake: { w: 80, h: 44, res: 5, collide: true },
};

/** player car is 0.3 road-halves wide */
export const SPRITE_SCALE = 0.3 / SPRITE_DEFS.player.w;

export const TRAFFIC_KINDS: SpriteKind[] = ['carCoupe', 'carSedan', 'carVan', 'carTruck'];

export function spriteWorldWidth(kind: SpriteKind): number {
  return SPRITE_DEFS[kind].w * SPRITE_SCALE;
}
