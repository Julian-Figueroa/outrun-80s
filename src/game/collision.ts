import { overlap } from '../math';
import { SPRITE_DEFS, spriteWorldWidth } from '../spriteDefs';
import type { Car, Segment, SpriteInstance } from '../types';

/** roadside sprites are anchored at their inner edge, so shift to the sprite's center */
export function checkSpriteCollision(segment: Segment, playerX: number, playerW: number): SpriteInstance | null {
  for (const sprite of segment.sprites) {
    if (!SPRITE_DEFS[sprite.kind].collide) continue;
    const w = spriteWorldWidth(sprite.kind);
    const center = sprite.offset + (w / 2) * (sprite.offset > 0 ? 1 : -1);
    // trunks/poles are narrower than their sprites
    if (overlap(playerX, playerW, center, w, 0.5)) return sprite;
  }
  return null;
}

export function checkCarCollision(segment: Segment, playerX: number, playerW: number, speed: number): Car | null {
  for (const car of segment.cars) {
    if (speed > car.speed && overlap(playerX, playerW, car.offset, spriteWorldWidth(car.kind), 0.8)) return car;
  }
  return null;
}
