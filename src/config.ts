// Central tunables. Units: world units unless noted; "road halves" = playerX/offset units
// where -1..1 spans the road surface.

export const GAME_TITLE = 'SUNSET RUN';

export const IS_TOUCH =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export const STEP = 1 / 60;
export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2000;
export const LANES = 3;
export const FIELD_OF_VIEW = 100;
export const CAMERA_HEIGHT = 1000;
export const CAMERA_DEPTH = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180);
export const PLAYER_Z = CAMERA_HEIGHT * CAMERA_DEPTH;
export const DRAW_DISTANCE = IS_TOUCH ? 180 : 300;
export const FOG_DENSITY = 5;
export const MAX_RENDER_HEIGHT = IS_TOUCH ? 540 : 720;

export const MAX_SPEED = SEGMENT_LENGTH / STEP;
export const ACCEL = MAX_SPEED / 5;
export const BREAKING = -MAX_SPEED;
export const DECEL = -MAX_SPEED / 5;
export const OFFROAD_DECEL = -MAX_SPEED / 2;
export const OFFROAD_LIMIT = MAX_SPEED / 4;
// hard curves (6) need a lift below ~75% speed; medium curves are flat-out with full lock
export const CENTRIFUGAL = 0.22;
export const DISPLAY_MAX_KMH = 293;

export const CRASH_SPIN_TIME = 1.1;
export const SPIN_OUT_MIN_SPEED = MAX_SPEED * 0.35;

// time per stage lives on each stage in track/course.ts; a clean, traffic-free run reaches every
// checkpoint with roughly 12-16s to spare on any route (see tests/balance.test.ts)
export const TRAFFIC_PER_SEGMENT = 0.02;

// route split: the road widens over FORK_WIDEN segments, then the branches pull apart until their
// centers are 2 × FORK_SPREAD road halves apart (far enough that the other one leaves the screen)
export const FORK_WIDEN = 40;
export const FORK_SPLIT = 300;
export const FORK_SPREAD = 10;

export const GRID_Z_SPACING = 4; // segments between horizontal grid lines
export const GRID_X_OFFSETS: number[] = (() => {
  const xs: number[] = [];
  for (let k = 1.6; k < 14; k += 0.9) xs.push(-k, k);
  return xs;
})();

// HUD and marker colors; the world palette is per biome (track/biomes.ts)
export const COLORS = {
  checkerA: '#f4f0ff',
  neonPink: '#ff2a6d',
  neonCyan: '#05d9e8',
  neonYellow: '#ffe66d',
  hudText: '#f8f0ff',
};
