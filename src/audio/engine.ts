import type { GameEvent } from '../game/state';
import { mtof, type AudioGraph } from './graph';

/** two detuned oscillators whose pitch tracks speed, with a fake two-gear shift */
export class Engine {
  private readonly osc1: OscillatorNode;
  private readonly osc2: OscillatorNode;
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;

  constructor(private readonly g: AudioGraph) {
    const { ctx } = g;
    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'square';
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 4;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.gain);
    this.gain.connect(g.sfx);
    this.osc1.start();
    this.osc2.start();
  }

  update(pct: number, throttle: boolean, running: boolean): void {
    const t = this.g.ctx.currentTime;
    const gear = pct < 0.45 ? pct / 0.45 : (pct - 0.45) / 0.55;
    const base = pct < 0.45 ? 38 : 58;
    const f = base + gear * 85;
    this.osc1.frequency.setTargetAtTime(f, t, 0.06);
    this.osc2.frequency.setTargetAtTime(f * 0.501, t, 0.06);
    this.filter.frequency.setTargetAtTime(300 + pct * 900 + (throttle ? 400 : 0), t, 0.08);
    const vol = running ? 0.05 + pct * 0.08 + (throttle ? 0.03 : 0) : 0;
    this.gain.gain.setTargetAtTime(vol, t, 0.1);
  }
}

function tone(g: AudioGraph, type: OscillatorType, freq: number, start: number, dur: number, vol: number, endFreq?: number) {
  const { ctx } = g;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  const a = ctx.createGain();
  a.gain.setValueAtTime(vol, start);
  a.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(a).connect(g.sfx);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(g: AudioGraph, start: number, dur: number, vol: number, cutoff: number) {
  const { ctx } = g;
  const src = ctx.createBufferSource();
  src.buffer = g.noise;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(cutoff, start);
  f.frequency.exponentialRampToValueAtTime(200, start + dur);
  const a = ctx.createGain();
  a.gain.setValueAtTime(vol, start);
  a.gain.exponentialRampToValueAtTime(0.001, start + dur);
  src.connect(f).connect(a).connect(g.sfx);
  src.start(start);
  src.stop(start + dur + 0.02);
}

export function playSfx(g: AudioGraph, e: GameEvent): void {
  const t = g.ctx.currentTime;
  switch (e.type) {
    case 'crash':
      noise(g, t, 0.7, 0.7, 3000);
      tone(g, 'sine', 110, t, 0.5, 0.8, 30);
      break;
    case 'bump':
      noise(g, t, 0.2, 0.4, 1200);
      tone(g, 'sine', 90, t, 0.18, 0.5, 40);
      break;
    case 'beep':
      tone(g, 'square', e.high ? 1320 : 660, t, e.high ? 0.45 : 0.18, 0.18);
      break;
    case 'checkpoint':
      [69, 73, 76, 81, 85].forEach((m, i) => tone(g, 'square', mtof(m + 12), t + i * 0.07, 0.18, 0.12));
      break;
    case 'finish':
      [69, 73, 76, 81, 76, 81, 85, 88].forEach((m, i) => tone(g, 'sawtooth', mtof(m), t + i * 0.12, 0.3, 0.1));
      break;
    case 'gameover':
      [64, 60, 57, 52].forEach((m, i) => tone(g, 'sawtooth', mtof(m), t + i * 0.25, 0.4, 0.12));
      break;
  }
}
