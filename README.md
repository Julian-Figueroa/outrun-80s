# Sunset Run

An Out Run–style pseudo-3D arcade racer with a synthwave look. Vite + TypeScript + Canvas 2D, no engine. All art is drawn procedurally and all music is synthesized with WebAudio.

## Run

```sh
nvm use            # Node 24 (.nvmrc)
npm install
npm run dev        # http://localhost:5173  (add -- --host to test on a phone over LAN)
npm test           # vitest: math, track, time-attack balance
npm run build      # typecheck + production bundle in dist/
```

Controls: ←/→ steer, ↑ gas, ↓ brake, Enter start, M mute, P pause. On touch devices, on-screen pads appear.

Dev helpers: `?demo` starts a race on autopilot, and `?demo&skip=60` fast-forwards 60 s first.

## Layout

- `src/track/`: segment builder (curves and hills) and the 4-stage course
- `src/game/`: player physics, traffic AI, collisions and spin-outs, countdown, checkpoints, and goal
- `src/render/`: road projection with the neon grid, background (sun, mountains), sprites, and HUD
- `src/audio/`: music sequencer, engine tone, and SFX
- `src/config.ts`: every tunable (speeds, timer, colors, draw distance)
