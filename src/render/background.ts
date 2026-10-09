import { mulberry32 } from '../math';
import { BIOMES, type Biome, type BiomeId } from '../track/biomes';

interface View {
  skyOffset: number;
  hillOffset: number;
  sunOffset: number;
  biome: BiomeId;
  prevBiome: BiomeId;
  biomeBlend: number;
}

interface Layers {
  sky: HTMLCanvasElement;
  sun: HTMLCanvasElement;
  far: HTMLCanvasElement;
  near: HTMLCanvasElement;
  biome: Biome;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}

/** periodic ridge so the layer tiles seamlessly */
function ridge(width: number, rng: () => number, harmonics: number[]): (x: number) => number {
  const waves = harmonics.map((k) => ({ k, phase: rng() * Math.PI * 2, amp: 0.4 + rng() * 0.6 }));
  const total = waves.reduce((a, w) => a + w.amp, 0);
  return (x) => {
    let v = 0;
    for (const w of waves) v += w.amp * Math.sin((x / width) * Math.PI * 2 * w.k + w.phase);
    return (v / total + 1) / 2;
  };
}

function mountainLayer(width: number, height: number, seed: number, fill: [string, string], line: string, harmonics: number[]) {
  const [c, g] = canvas(width, height);
  const rng = mulberry32(seed);
  const f = ridge(width, rng, harmonics);
  const step = width / 160;
  const pts: [number, number][] = [];
  for (let x = 0; x <= width + 0.5; x += step) pts.push([x, height * (1 - Math.pow(f(x), 1.6) * 0.95)]);

  const grad = g.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, fill[0]);
  grad.addColorStop(1, fill[1]);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, height);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(width, height);
  g.closePath();
  g.fill();

  // wireframe hatching
  g.save();
  g.clip();
  g.strokeStyle = line;
  g.globalAlpha = 0.18;
  g.lineWidth = 1;
  for (let i = 0; i < pts.length; i += 4) {
    g.beginPath();
    g.moveTo(pts[i][0], pts[i][1]);
    g.lineTo(pts[i][0] + (pts[i][0] / width - 0.5) * 30, height);
    g.stroke();
  }
  for (let y = height * 0.25; y < height; y += height / 7) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(width, y);
    g.stroke();
  }
  g.restore();

  g.strokeStyle = line;
  g.lineWidth = Math.max(1.5, height / 60);
  g.shadowColor = line;
  g.shadowBlur = 6;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  return c;
}

/** sky, sun and mountains per biome, baked lazily at the current size */
export class Background {
  private w = 0;
  private h = 0;
  private readonly layers = new Map<BiomeId, Layers>();

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.layers.clear();
  }

  private bake(id: BiomeId): Layers {
    let out = this.layers.get(id);
    if (out) return out;
    const { w, h } = this;
    const biome = BIOMES[id];
    const horizon = h / 2;

    const [sky, sg] = canvas(w, horizon + 2);
    const grad = sg.createLinearGradient(0, 0, 0, horizon);
    for (const [stop, color] of biome.skyStops) grad.addColorStop(stop, color);
    sg.fillStyle = grad;
    sg.fillRect(0, 0, w, horizon + 2);
    const rng = mulberry32(7);
    for (let i = 0; i < biome.stars; i++) {
      const y = Math.pow(rng(), 1.8) * horizon * 0.7;
      sg.globalAlpha = 0.3 + rng() * 0.7 * (1 - y / horizon);
      sg.fillStyle = rng() < 0.2 ? '#ffd6f5' : '#ffffff';
      const r = rng() < 0.1 ? 1.6 : 0.9;
      sg.fillRect(rng() * w, y, r * (h / 480), r * (h / 480));
    }
    sg.globalAlpha = 1;

    const tileW = Math.max(w, h) * 1.6;
    const [farTop, farBottom, farLine] = biome.far;
    const [nearTop, nearBottom, nearLine] = biome.near;
    out = {
      sky,
      sun: this.makeSun(h * 0.2, biome),
      far: mountainLayer(tileW, h * 0.15, 3, [farTop, farBottom], farLine, [2, 3, 5, 9]),
      near: mountainLayer(tileW, h * 0.09, 11, [nearTop, nearBottom], nearLine, [3, 4, 7, 13]),
      biome,
    };
    this.layers.set(id, out);
    return out;
  }

  private makeSun(r: number, biome: Biome): HTMLCanvasElement {
    const size = r * 3.2;
    const [disc, dg] = canvas(r * 2, r * 2);
    const grad = dg.createLinearGradient(0, 0, 0, r * 2);
    grad.addColorStop(0, biome.sun[0]);
    grad.addColorStop(0.45, biome.sun[1]);
    grad.addColorStop(1, biome.sun[2]);
    dg.fillStyle = grad;
    dg.beginPath();
    dg.arc(r, r, r, 0, Math.PI * 2);
    dg.fill();
    dg.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 8; i++) {
      const y = r * (1.0 + i * 0.13);
      dg.fillRect(0, y, r * 2, r * (0.018 + i * 0.014));
    }

    const [c, g] = canvas(size, size);
    const glow = g.createRadialGradient(size / 2, size / 2, r * 0.6, size / 2, size / 2, size / 2);
    glow.addColorStop(0, `rgba(${biome.sunGlow},0.45)`);
    glow.addColorStop(1, `rgba(${biome.sunGlow},0)`);
    g.fillStyle = glow;
    g.fillRect(0, 0, size, size);
    g.drawImage(disc, size / 2 - r, size / 2 - r);
    return c;
  }

  draw(ctx: CanvasRenderingContext2D, v: View): void {
    if (v.biomeBlend < 1 && v.prevBiome !== v.biome) {
      this.drawLayers(ctx, this.bake(v.prevBiome), v);
      ctx.globalAlpha = v.biomeBlend;
      this.drawLayers(ctx, this.bake(v.biome), v);
      ctx.globalAlpha = 1;
    } else {
      this.drawLayers(ctx, this.bake(v.biome), v);
    }
  }

  private drawLayers(ctx: CanvasRenderingContext2D, l: Layers, v: View): void {
    const { w, h } = this;
    const horizon = h / 2;
    ctx.drawImage(l.sky, 0, 0);

    const sunX = w / 2 + v.sunOffset * w - l.sun.width / 2;
    const sunY = horizon - l.sun.height / 2 - h * 0.05;
    ctx.drawImage(l.sun, sunX, sunY);

    this.tile(ctx, l.far, v.skyOffset, horizon - l.far.height + 1);
    this.tile(ctx, l.near, v.hillOffset, horizon - l.near.height + 1);

    ctx.fillStyle = l.biome.fog;
    ctx.fillRect(0, horizon, w, h - horizon);
    const glow = ctx.createLinearGradient(0, horizon - h * 0.01, 0, horizon + h * 0.03);
    glow.addColorStop(0, `rgba(${l.biome.horizonGlow},0)`);
    glow.addColorStop(0.3, `rgba(${l.biome.horizonGlow},0.75)`);
    glow.addColorStop(1, `rgba(${l.biome.horizonGlow},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - h * 0.01, w, h * 0.04);
  }

  private tile(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, offset: number, y: number) {
    const tw = img.width;
    let x = -((((offset * tw) % tw) + tw) % tw);
    for (; x < this.w; x += tw) ctx.drawImage(img, Math.floor(x), Math.floor(y));
  }
}
