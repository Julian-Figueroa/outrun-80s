import { AudioSystem } from './audio/synth';
import { IS_TOUCH, MAX_RENDER_HEIGHT, MAX_SPEED, STEP } from './config';
import { autopilot } from './game/autopilot';
import { updatePlayer } from './game/player';
import { updateRace } from './game/race';
import { createGame, startRace, type GameState } from './game/state';
import { createKeyboard, type Action } from './input/keyboard';
import { createTouch } from './input/touch';
import { Renderer } from './render/renderer';
import { createSprites } from './render/sprites';
import type { InputState } from './types';

/** `?demo` starts a race immediately and drives it (handy for tuning and screenshots) */
const params = new URLSearchParams(location.search);
const DEMO = params.has('demo');
/** `?demo&skip=30` fast-forwards the simulation 30 seconds on load */
const SKIP = Number(params.get('skip') ?? 0);

async function boot() {
  // sprites bake text into canvases, so give the webfont a moment to arrive
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const renderer = new Renderer(canvas, createSprites());
  const audio = new AudioSystem();
  let state: GameState = createGame();
  let endedFor = 0;

  const onAction = (action: Action) => {
    audio.unlock();
    if (action === 'mute') {
      audio.toggleMute();
      return;
    }
    if (state.paused) {
      state.paused = false;
      audio.suspend(false);
      return;
    }
    if (action === 'pause') {
      if (state.phase === 'playing' || state.phase === 'countdown') {
        state.paused = true;
        audio.suspend(true);
      }
      return;
    }
    const ended = state.phase === 'gameover' || state.phase === 'finished';
    if (state.phase === 'title' || (ended && endedFor > 1.5)) {
      state = startRace(state);
      endedFor = 0;
      audio.startMusic();
    }
  };

  const keyboard = createKeyboard(onAction);
  const touch = createTouch(canvas, onAction);
  const input: InputState = { left: false, right: false, faster: false, slower: false };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const h = Math.round(Math.min(window.innerHeight * dpr, MAX_RENDER_HEIGHT));
    const w = Math.round((h * window.innerWidth) / window.innerHeight);
    renderer.resize(w, h);
  };
  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state.phase === 'playing' || state.phase === 'countdown')) {
      state.paused = true;
      audio.suspend(true);
    }
  });

  if (DEMO) state = startRace(state);

  const update = (dt: number) => {
    input.left = keyboard.left || touch.left;
    input.right = keyboard.right || touch.right;
    input.faster = keyboard.faster || touch.faster;
    input.slower = keyboard.slower || touch.slower;
    if (DEMO) autopilot(state, input);

    state.clock += dt;
    if (state.phase === 'title') return;
    updatePlayer(state, dt, input);
    updateRace(state, dt);
    if (state.phase === 'gameover' || state.phase === 'finished') endedFor += dt;
  };

  for (let t = 0; DEMO && t < SKIP; t += STEP) update(STEP);
  state.events.length = 0;

  let last = performance.now();
  let acc = 0;
  const frame = (now: number) => {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    if (state.paused) acc = 0;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }

    for (const e of state.events) audio.handle(e);
    state.events.length = 0;
    audio.updateEngine(state.speed / MAX_SPEED, state.throttle, state.phase !== 'title' && !state.paused);

    renderer.render(state, {
      muted: audio.muted,
      touch: IS_TOUCH,
      portrait: window.innerHeight > window.innerWidth,
      endedFor,
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

void boot();
