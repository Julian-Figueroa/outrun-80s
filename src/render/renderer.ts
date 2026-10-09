import type { GameState } from '../game/state';
import { Background } from './background';
import { drawHud, type HudOptions } from './hud';
import { renderWorld } from './road';
import type { SpriteSheet } from './sprites';

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly background = new Background();
  private width = 0;
  private height = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly sprites: SpriteSheet,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
  }

  resize(width: number, height: number): void {
    this.width = this.canvas.width = width;
    this.height = this.canvas.height = height;
    this.background.resize(width, height);
  }

  render(s: GameState, hud: HudOptions): void {
    const { ctx, width, height } = this;
    this.background.draw(ctx, s);
    renderWorld(ctx, width, height, s, this.sprites);
    drawHud(ctx, width, height, s, hud);
  }
}
