import { SONGS } from './audio/music';
import { AudioSystem } from './audio/synth';
import { IS_TOUCH, MAX_RENDER_HEIGHT, MAX_SPEED, STEP } from './config';
import { autopilot } from './game/autopilot';
import { beginEntry, changeStation, createMeta, entryInput, qualifiesForEntry } from './game/meta';
import { updatePlayer } from './game/player';
import { updateRace } from './game/race';
import { createGame, startRace, type GameState } from './game/state';
import { createGamepad } from './input/gamepad';
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
/** `?demo&route=LRR` picks the autopilot's side at each split */
const DEMO_ROUTE = [...(params.get('route') ?? 'LRR').toUpperCase()].map((c) => (c === 'L' ? -1 : 1));

/** `?notraffic` clears every car, including those spawned at each split (tuning and screenshots) */
const NO_TRAFFIC = params.has('notraffic');

/** `?demo&skip=40&freeze` holds the frame after the skip (screenshots) */
const FREEZE = params.has('freeze');

/** after a race, how long before the results accept input / jump to initials entry */
const RESULTS_LOCK = 1.5;
const AUTO_ENTRY = 2.5;

async function boot() {
  // sprites bake text into canvases, so give the webfont a moment to arrive
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const renderer = new Renderer(canvas, createSprites());
  const audio = new AudioSystem();
  const meta = createMeta();
  let state: GameState = createGame();
  let endedFor = 0;

  const ended = () => state.phase === 'gameover' || state.phase === 'finished';
  const racing = () => state.phase === 'playing' || state.phase === 'countdown';

  const toTitle = () => {
    state = createGame();
    meta.screen = 'title';
    endedFor = 0;
  };

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
    if (action === 'menu') action = racing() ? 'pause' : 'start';
    if (action === 'pause') {
      if (racing()) {
        state.paused = true;
        audio.suspend(true);
      }
      return;
    }

    switch (meta.screen) {
      case 'title':
        if (action === 'left' || action === 'right') {
          changeStation(meta, action === 'left' ? -1 : 1);
          audio.playMusic(SONGS[meta.station]);
        } else if (action === 'start') {
          state = startRace(state);
          meta.screen = 'race';
          endedFor = 0;
          audio.playMusic(SONGS[meta.station]);
        }
        break;
      case 'race':
        if (action === 'start' && ended() && endedFor > RESULTS_LOCK) {
          if (!DEMO && qualifiesForEntry(meta, state)) beginEntry(meta);
          else toTitle();
        }
        break;
      case 'entry':
        entryInput(meta, state, action);
        break;
      case 'ranking':
        if (action === 'start') toTitle();
        break;
    }
  };

  const keyboard = createKeyboard(onAction);
  const touch = createTouch(canvas, onAction);
  const gamepad = createGamepad(onAction);
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
    if (document.hidden && racing()) {
      state.paused = true;
      audio.suspend(true);
    }
  });

  if (DEMO) {
    state = startRace(state);
    meta.screen = 'race';
  }

  const update = (dt: number) => {
    gamepad.poll();
    const pad = gamepad.input;
    input.left = keyboard.left || touch.left || pad.left;
    input.right = keyboard.right || touch.right || pad.right;
    input.faster = keyboard.faster || touch.faster || pad.faster;
    input.slower = keyboard.slower || touch.slower || pad.slower;
    if (DEMO) autopilot(state, input, DEMO_ROUTE);

    state.clock += dt;
    // the title shows a preview of the selected station once audio is allowed to play
    if (meta.screen === 'title') {
      if (audio.unlocked) audio.playMusic(SONGS[meta.station]);
      return;
    }
    if (state.paused) return;
    if (NO_TRAFFIC && state.cars.length) {
      for (const seg of state.track.segments) seg.cars.length = 0;
      state.cars.length = 0;
    }
    updatePlayer(state, dt, input);
    updateRace(state, dt);
    if (ended()) {
      endedFor += dt;
      if (!DEMO && meta.screen === 'race' && endedFor > AUTO_ENTRY && qualifiesForEntry(meta, state)) beginEntry(meta);
    }
  };

  // dev console access: `__sunset().track.forks`
  if (import.meta.env.DEV) Object.assign(window, { __sunset: () => state });

  for (let t = 0; DEMO && t < SKIP; t += STEP) update(STEP);
  state.events.length = 0;
  if (FREEZE) state.message = null;

  let last = performance.now();
  let acc = 0;
  const frame = (now: number) => {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    if (state.paused) {
      acc = 0;
      gamepad.poll(); // Start still has to be able to unpause
    }
    while (acc >= STEP && !FREEZE) {
      update(STEP);
      acc -= STEP;
    }

    for (const e of state.events) {
      audio.handle(e);
      if (e.type === 'crash') gamepad.rumble(1, 0.7, 450);
      else if (e.type === 'bump') gamepad.rumble(0.4, 0.4, 150);
    }
    state.events.length = 0;
    audio.updateEngine(state.speed / MAX_SPEED, state.throttle, meta.screen !== 'title' && !state.paused);

    renderer.render(state, {
      muted: audio.muted,
      touch: IS_TOUCH,
      portrait: window.innerHeight > window.innerWidth,
      endedFor,
      meta,
      gamepad: gamepad.connected,
    });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

void boot();
