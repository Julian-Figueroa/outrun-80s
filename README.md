# Sunset Run

An Out Run–style pseudo-3D arcade racer with a synthwave look. Vite + TypeScript + Canvas 2D, no engine. All art is drawn procedurally and all music is synthesized with WebAudio.

## Run

```sh
nvm use            # Node 24 (.nvmrc)
npm install
npm run dev        # http://localhost:5173  (add -- --host to test on a phone over LAN)
npm test           # vitest: math, track/routes, scores, time-attack balance on all 8 routes
npm run build      # typecheck + production bundle in dist/
```

Controls: ←/→ steer, ↑ gas, ↓ brake, Enter start, M mute, P pause. On touch devices, on-screen pads appear. Gamepads work too: the stick or d-pad steers, A/RT is gas, B/X/LT is brake, Start pauses, and Back mutes. Crashes rumble the pad if it supports that.

## Phase 2 features

- **Branching routes**: an Out Run–style pyramid of 10 stages over 4 levels. At the end of each stage the road widens and splits, and you commit to whichever side you're on at the nose. That gives 8 routes and 4 goals.
- **Biomes**: coast, boulevard, red canyon, desert, neon city, pine forest, snowline, and sunset bay. Each one has its own sky, sun, mountains, road, grid, and props. Road colors change per segment, and the sky crossfades at each checkpoint.
- **Radio**: pick one of three synthwave tracks with ←/→ on the title screen. Your choice is remembered.
- **High scores**: a top-10 table in localStorage, with arcade-style 3-letter initials entry.

Dev helpers: `?demo` starts a race on autopilot, `?demo&skip=60` fast-forwards 60 s first, `?demo&route=LRL` picks the autopilot's side at each split, `?notraffic` empties the road, and `&freeze` holds the frame after the skip.

## Layout

- `src/track/`: segment builder (curves, hills, and route splits), the stage pyramid, and biome palettes
- `src/game/`: player physics, traffic AI, collisions and spin-outs, route commits, countdown, checkpoints, goal, screens, and high scores
- `src/render/`: road projection with the neon grid, background (sun, mountains), sprites, and HUD
- `src/audio/`: music sequencer, engine tone, and SFX
- `src/config.ts`: every tunable (speeds, timer, colors, draw distance)
