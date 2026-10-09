import { SPRITE_DEFS, type SpriteKind } from '../spriteDefs';

/** every sprite is drawn procedurally once at startup into an offscreen canvas */
export type SpriteSheet = Record<SpriteKind, HTMLCanvasElement>;

type Ctx = CanvasRenderingContext2D;

const FONT = 'Orbitron, "Trebuchet MS", sans-serif';

function make(kind: SpriteKind, draw: (g: Ctx, w: number, h: number) => void): HTMLCanvasElement {
  const { w, h, res } = SPRITE_DEFS[kind];
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * res);
  c.height = Math.ceil(h * res);
  const g = c.getContext('2d')!;
  g.scale(res, res);
  draw(g, w, h);
  return c;
}

function mirror(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d')!;
  g.translate(c.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

function roundRect(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function neonText(g: Ctx, text: string, x: number, y: number, size: number, color: string, glow = 8) {
  g.save();
  g.font = `900 italic ${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = glow;
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = `900 italic ${size * 0.96}px ${FONT}`;
  g.fillText(text, x, y);
  g.restore();
}

// ---------- scenery ----------

/** palm leaning to the right (toward the road when placed on the left) */
function drawPalm(g: Ctx, w: number, h: number) {
  const baseX = w * 0.42;
  const topX = w * 0.62;
  const topY = h * 0.22;
  const segs = 16;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    const bend = (t: number) => baseX + (topX - baseX) * t * t;
    const y0 = h - (h - topY) * t0;
    const y1 = h - (h - topY) * t1;
    const w0 = 9 - 4 * t0;
    const w1 = 9 - 4 * t1;
    g.fillStyle = i % 2 ? '#2b0f40' : '#3a1655';
    g.beginPath();
    g.moveTo(bend(t0) - w0, y0);
    g.lineTo(bend(t0) + w0, y0);
    g.lineTo(bend(t1) + w1 + 1.5, y1);
    g.lineTo(bend(t1) - w1 - 1.5, y1);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,79,163,0.55)';
    g.fillRect(bend(t0) + w0 - 2, y1, 2, y0 - y1);
  }
  const leaves = [-2.9, -2.4, -1.9, -1.35, -0.75, -0.25, 0.25, -3.3];
  for (const a of leaves) {
    const len = 62 + ((a * 13) % 9);
    const tipX = topX + Math.cos(a) * len;
    const tipY = topY + Math.sin(a) * len * 0.55 + 28;
    const midX = topX + Math.cos(a) * len * 0.5;
    const midY = topY + Math.sin(a) * len * 0.55 - 14;
    g.beginPath();
    g.moveTo(topX, topY);
    g.quadraticCurveTo(midX, midY - 10, tipX, tipY);
    g.quadraticCurveTo(midX, midY + 6, topX, topY + 4);
    g.fillStyle = '#1a0828';
    g.fill();
    g.strokeStyle = '#ff4fa3';
    g.lineWidth = 1.6;
    g.stroke();
    g.beginPath();
    g.moveTo(topX, topY + 2);
    g.quadraticCurveTo(midX, midY - 2, tipX, tipY);
    g.strokeStyle = 'rgba(255,79,163,0.4)';
    g.lineWidth = 0.8;
    g.stroke();
  }
  g.fillStyle = '#ff7ab8';
  for (const [dx, dy] of [[-4, 6], [3, 8], [0, 3]]) {
    g.beginPath();
    g.arc(topX + dx, topY + dy, 3.2, 0, Math.PI * 2);
    g.fill();
  }
}

/** street lamp with the arm reaching right (toward the road when placed on the left) */
function drawLamp(g: Ctx, w: number, h: number) {
  const poleX = 22;
  const lightX = w - 46;
  const glow = g.createRadialGradient(lightX, 36, 2, lightX, 36, 32);
  glow.addColorStop(0, 'rgba(5,217,232,0.4)');
  glow.addColorStop(1, 'rgba(5,217,232,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#241038';
  g.fillRect(poleX - 5, 30, 10, h - 30);
  g.fillRect(poleX - 9, h - 14, 18, 14);
  g.fillStyle = 'rgba(5,217,232,0.6)';
  g.fillRect(poleX + 3, 30, 2, h - 44);
  g.beginPath();
  g.moveTo(poleX - 5, 34);
  g.quadraticCurveTo(poleX, 22, poleX + 20, 24);
  g.lineTo(w - 26, 24);
  g.lineTo(w - 26, 31);
  g.lineTo(poleX + 20, 31);
  g.quadraticCurveTo(poleX + 6, 30, poleX + 5, 40);
  g.closePath();
  g.fillStyle = '#241038';
  g.fill();
  g.save();
  g.shadowColor = '#05d9e8';
  g.shadowBlur = 12;
  g.fillStyle = '#b8fbff';
  roundRect(g, w - 62, 31, 34, 6, 3);
  g.fill();
  g.restore();
}

function drawCactus(g: Ctx, w: number, h: number) {
  g.save();
  g.fillStyle = '#0c2b33';
  g.strokeStyle = '#05d9e8';
  g.lineWidth = 2;
  const cx = w / 2;
  const part = (x: number, y: number, pw: number, ph: number) => {
    roundRect(g, x, y, pw, ph, pw / 2);
    g.fill();
    g.stroke();
  };
  part(cx - 26 - 16, 70, 16, 70);
  part(cx - 26 - 16, 124, 30, 14);
  part(cx + 26, 50, 16, 80);
  part(cx + 12, 112, 30, 14);
  part(cx - 13, 8, 26, h - 8);
  g.strokeStyle = 'rgba(5,217,232,0.35)';
  g.lineWidth = 1;
  for (const dx of [-5, 0, 5]) {
    g.beginPath();
    g.moveTo(cx + dx, 20);
    g.lineTo(cx + dx, h - 4);
    g.stroke();
  }
  g.restore();
}

function billboard(text: string, sub: string, color: string, accent: string) {
  return (g: Ctx, w: number, h: number) => {
    g.fillStyle = '#1b0a2c';
    g.fillRect(55, 140, 12, h - 140);
    g.fillRect(w - 67, 140, 12, h - 140);
    const bg = g.createLinearGradient(0, 10, 0, 150);
    bg.addColorStop(0, '#1e0838');
    bg.addColorStop(1, '#3a0b4f');
    g.fillStyle = bg;
    roundRect(g, 8, 8, w - 16, 140, 10);
    g.fill();
    g.save();
    g.shadowColor = color;
    g.shadowBlur = 10;
    g.strokeStyle = color;
    g.lineWidth = 4;
    roundRect(g, 14, 14, w - 28, 128, 8);
    g.stroke();
    g.restore();
    neonText(g, text, w / 2, 66, 44, color, 14);
    neonText(g, sub, w / 2, 114, 20, accent, 8);
  };
}

function gantry(text: string, color: string, checkered: boolean) {
  return (g: Ctx, w: number, h: number) => {
    const post = (x: number) => {
      g.fillStyle = '#1b0a2c';
      g.fillRect(x, 70, 26, h - 70);
      g.fillStyle = color;
      g.globalAlpha = 0.7;
      g.fillRect(x + 20, 80, 3, h - 90);
      g.globalAlpha = 1;
    };
    post(18);
    post(w - 44);
    g.fillStyle = '#160726';
    roundRect(g, 0, 8, w, 84, 8);
    g.fill();
    if (checkered) {
      const sq = 10;
      for (let x = 0; x < w; x += sq) {
        for (const y of [8, 82]) {
          g.fillStyle = ((x / sq) | 0) % 2 === (y === 8 ? 0 : 1) ? '#f4f0ff' : '#160726';
          g.fillRect(x, y, sq, sq);
        }
      }
    }
    g.save();
    g.shadowColor = color;
    g.shadowBlur = 12;
    g.strokeStyle = color;
    g.lineWidth = 3;
    roundRect(g, 4, checkered ? 20 : 12, w - 8, checkered ? 60 : 76, 6);
    g.stroke();
    g.restore();
    neonText(g, text, w / 2, 50, 46, color, 16);
  };
}

// ---------- cars (rear view) ----------

interface CarStyle {
  body: string;
  dark: string;
  glass: string;
  bodyTop: number;
  cabinTop: number;
  cabinInset: number;
  spoiler?: boolean;
  stripe?: string;
  lightStrip?: boolean;
  brake?: boolean;
}

function drawCar(s: CarStyle) {
  return (g: Ctx, w: number, h: number) => {
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath();
    g.ellipse(w / 2, h - 2.5, w * 0.5, 3, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#0b0712';
    roundRect(g, w * 0.05, h - 13, w * 0.19, 13, 2.5);
    g.fill();
    roundRect(g, w * 0.76, h - 13, w * 0.19, 13, 2.5);
    g.fill();

    // cabin
    g.fillStyle = s.dark;
    g.beginPath();
    g.moveTo(s.cabinInset, s.bodyTop + 1);
    g.lineTo(w - s.cabinInset, s.bodyTop + 1);
    g.lineTo(w - s.cabinInset - 6, s.cabinTop);
    g.lineTo(s.cabinInset + 6, s.cabinTop);
    g.closePath();
    g.fill();
    g.fillStyle = s.glass;
    g.beginPath();
    g.moveTo(s.cabinInset + 3, s.bodyTop);
    g.lineTo(w - s.cabinInset - 3, s.bodyTop);
    g.lineTo(w - s.cabinInset - 8, s.cabinTop + 2.5);
    g.lineTo(s.cabinInset + 8, s.cabinTop + 2.5);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(184,251,255,0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(s.cabinInset + 12, s.bodyTop - 2);
    g.lineTo(s.cabinInset + 18, s.cabinTop + 4);
    g.stroke();

    // body
    const grad = g.createLinearGradient(0, s.bodyTop, 0, h - 6);
    grad.addColorStop(0, s.body);
    grad.addColorStop(1, s.dark);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(3, s.bodyTop);
    g.lineTo(w - 3, s.bodyTop);
    g.lineTo(w - 1, h - 6);
    g.lineTo(1, h - 6);
    g.closePath();
    g.fill();

    if (s.spoiler) {
      g.fillStyle = s.dark;
      g.fillRect(14, s.bodyTop - 3, 3, 3);
      g.fillRect(w - 17, s.bodyTop - 3, 3, 3);
      g.fillStyle = '#16061f';
      roundRect(g, 1, s.bodyTop - 6, w - 2, 4, 1.5);
      g.fill();
    }

    // lights
    const ly = s.bodyTop + 4;
    g.save();
    if (s.brake) {
      g.shadowColor = '#ff3355';
      g.shadowBlur = 8;
    }
    g.fillStyle = s.brake ? '#ff8a95' : '#e0143c';
    if (s.lightStrip) {
      g.fillRect(5, ly, w - 10, 5);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      for (let x = 9; x < w - 6; x += 5) g.fillRect(x, ly, 1, 5);
    } else {
      g.fillRect(5, ly, w * 0.2, 5);
      g.fillRect(w - 5 - w * 0.2, ly, w * 0.2, 5);
    }
    g.restore();

    if (s.stripe) {
      g.fillStyle = s.stripe;
      g.fillRect(3, ly + 8, w - 6, 1.5);
    }
    g.fillStyle = '#e9e4ff';
    g.fillRect(w / 2 - 7, h - 15, 14, 5);
    g.fillStyle = '#0b0712';
    g.fillRect(4, h - 9, w - 8, 3);
    g.fillStyle = '#4a4458';
    g.beginPath();
    g.arc(w * 0.32, h - 7, 1.8, 0, Math.PI * 2);
    g.arc(w * 0.36, h - 7, 1.8, 0, Math.PI * 2);
    g.fill();
  };
}

function drawVan(g: Ctx, w: number, h: number) {
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath();
  g.ellipse(w / 2, h - 2.5, w * 0.5, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0b0712';
  roundRect(g, w * 0.06, h - 12, w * 0.18, 12, 2);
  g.fill();
  roundRect(g, w * 0.76, h - 12, w * 0.18, 12, 2);
  g.fill();
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#c7b8ff');
  grad.addColorStop(1, '#5a3f9e');
  g.fillStyle = grad;
  roundRect(g, 2, 4, w - 4, h - 10, 8);
  g.fill();
  g.fillStyle = '#1b0b33';
  roundRect(g, 10, 10, w / 2 - 13, 20, 3);
  g.fill();
  roundRect(g, w / 2 + 3, 10, w / 2 - 13, 20, 3);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(w / 2 - 1, 8, 2, h - 18);
  g.fillStyle = '#e0143c';
  g.fillRect(4, 34, 5, 14);
  g.fillRect(w - 9, 34, 5, 14);
  g.fillStyle = '#e9e4ff';
  g.fillRect(w / 2 - 7, h - 16, 14, 5);
  g.fillStyle = '#0b0712';
  g.fillRect(3, h - 9, w - 6, 4);
}

function drawTruck(g: Ctx, w: number, h: number) {
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath();
  g.ellipse(w / 2, h - 2.5, w * 0.5, 3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#0b0712';
  for (const x of [w * 0.04, w * 0.2, w * 0.64, w * 0.8]) {
    roundRect(g, x, h - 14, w * 0.15, 14, 2);
    g.fill();
  }
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#efe9ff');
  grad.addColorStop(1, '#8f86b5');
  g.fillStyle = grad;
  g.fillRect(1, 0, w - 2, h - 16);
  g.strokeStyle = 'rgba(40,20,70,0.35)';
  g.lineWidth = 1;
  for (let x = 8; x < w - 4; x += 8) {
    g.beginPath();
    g.moveTo(x, 4);
    g.lineTo(x, h - 20);
    g.stroke();
  }
  g.fillStyle = '#2a1748';
  g.fillRect(w / 2 - 1.5, 0, 3, h - 16);
  g.fillStyle = '#ff2a6d';
  g.fillRect(1, h - 22, w - 2, 3);
  g.fillStyle = '#e0143c';
  g.fillRect(4, h - 16, 10, 4);
  g.fillRect(w - 14, h - 16, 10, 4);
  g.fillStyle = '#0b0712';
  g.fillRect(2, h - 12, w - 4, 3);
}

export function createSprites(): SpriteSheet {
  const palmL = make('palmL', drawPalm);
  const lampL = make('lampL', drawLamp);
  const player: CarStyle = {
    body: '#ff2a6d',
    dark: '#6e0d3c',
    glass: '#1b0b33',
    bodyTop: 20,
    cabinTop: 5,
    cabinInset: 13,
    spoiler: true,
    stripe: '#05d9e8',
    lightStrip: true,
  };
  return {
    palmL,
    palmR: mirror(palmL),
    lampL,
    lampR: mirror(lampL),
    cactus: make('cactus', drawCactus),
    billboardA: make('billboardA', billboard('NEON COLA', 'TASTE THE GLOW', '#ff2a6d', '#ffe66d')),
    billboardB: make('billboardB', billboard('HYPERWAVE', 'RADIO  101.9 FM', '#05d9e8', '#ff7ab8')),
    billboardC: make('billboardC', billboard('CHROME', 'MOTOR CLUB  ·  EST 1986', '#ffe66d', '#05d9e8')),
    gantryStart: make('gantryStart', gantry('START', '#05d9e8', true)),
    gantryCheckpoint: make('gantryCheckpoint', gantry('CHECKPOINT', '#ffe66d', false)),
    gantryGoal: make('gantryGoal', gantry('GOAL', '#ff2a6d', true)),
    carCoupe: make(
      'carCoupe',
      drawCar({ body: '#21c8d8', dark: '#0a4a59', glass: '#0d1630', bodyTop: 19, cabinTop: 5, cabinInset: 15 }),
    ),
    carSedan: make(
      'carSedan',
      drawCar({ body: '#f7b538', dark: '#7a4a10', glass: '#1d1426', bodyTop: 24, cabinTop: 4, cabinInset: 11 }),
    ),
    carVan: make('carVan', drawVan),
    carTruck: make('carTruck', drawTruck),
    player: make('player', drawCar(player)),
    playerBrake: make('playerBrake', drawCar({ ...player, brake: true })),
  };
}
