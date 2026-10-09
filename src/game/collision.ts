import { overlap } from '../math';
import { SPRITE_DEFS, spriteWorldWidth } from '../spriteDefs';
import type { Car, Segment, SpriteInstance } from '../types';

/**
 * Roadside sprites are anchored at their inner edge (median sprites at offset 0 are centered), so
 * shift to the sprite's center. `playerX` is in the segment's frame, not relative to a branch.
 */
export function checkSpriteCollision(segment: Segment, playerX: number, playerW: number): SpriteInstance | null {
  for (const sprite of segment.sprites) {
    if (!SPRITE_DEFS[sprite.kind].collide) continue;
    const w = spriteWorldWidth(sprite.kind);
    const center = sprite.offset + (w / 2) * Math.sign(sprite.offset);
    // trunks/poles are narrower than their sprites
    if (overlap(playerX, playerW, center, w, 0.5)) return sprite;
  }
  return null;
}

/** `playerX` is relative to the player's branch; only cars on the same branch can be hit */
export function checkCarCollision(
  segment: Segment,
  playerX: number,
  playerW: number,
  speed: number,
  branch: number,
): Car | null {
  for (const car of segment.cars) {
    if (car.branch === branch && speed > car.speed && overlap(playerX, playerW, car.offset, spriteWorldWidth(car.kind), 0.8)) return car;
  }
  return null;
}
