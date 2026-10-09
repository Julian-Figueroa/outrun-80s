import { mtof, type AudioGraph } from './graph';

const BPM = 100;
const STEP = 60 / BPM / 4; // 16th note
const LOOKAHEAD = 0.12;

// i–VI–III–VII in A minor: Am F C G
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const BASS = [33, 29, 36, 31];
const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3];

/** lookahead step sequencer playing a looping 4-bar synthwave groove */
export class Music {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private readonly delayIn: GainNode;

  constructor(private readonly g: AudioGraph) {
    const { ctx } = g;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = STEP * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.delayIn = ctx.createGain();
    this.delayIn.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(g.music);
  }

  start(): void {
    if (this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.g.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const { ctx } = this.g;
    // after a suspend, skip ahead instead of firing a burst of stale notes
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.schedule(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % 128;
    }
  }

  private schedule(step: number, t: number): void {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const phrase = Math.floor(step / 64); // second 4 bars: arp up an octave
    const chord = CHORDS[bar];

    if (s % 4 === 0) this.kick(t);
    if (s === 4 || s === 12) this.snare(t);
    if (s % 2 === 1) this.hat(t, s % 4 === 3 ? 0.06 : 0.035);

    if (s % 2 === 0) this.bass(t, mtof(BASS[bar] + (s % 4 === 2 ? 12 : 0)));

    const tones = [...chord, chord[0] + 12, chord[1] + 12];
    this.arp(t, mtof(tones[ARP[s]] + 12 * phrase));

    if (s === 0) this.pad(t, chord.map(mtof), STEP * 16);
  }

  private env(t: number, peak: number, attack: number, decay: number, dest: AudioNode): GainNode {
    const a = this.g.ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.exponentialRampToValueAtTime(peak, t + attack);
    a.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    a.connect(dest);
    return a;
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, dest: AudioNode, detune = 0) {
    const o = this.g.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number) {
    const { ctx } = this.g;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    o.connect(this.env(t, 0.9, 0.003, 0.28, this.g.music));
    o.start(t);
    o.stop(t + 0.35);
  }

  private snare(t: number) {
    const { ctx } = this.g;
    const src = ctx.createBufferSource();
    src.buffer = this.g.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.7;
    const out = this.env(t, 0.45, 0.002, 0.2, this.g.music);
    out.connect(this.delayIn);
    src.connect(bp).connect(out);
    src.start(t);
    src.stop(t + 0.25);
    this.osc('triangle', 190, t, 0.08, this.env(t, 0.3, 0.002, 0.08, this.g.music));
  }

  private hat(t: number, vol: number) {
    const { ctx } = this.g;
    const src = ctx.createBufferSource();
    src.buffer = this.g.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    src.connect(hp).connect(this.env(t, vol, 0.002, 0.04, this.g.music));
    src.start(t);
    src.stop(t + 0.08);
  }

  private bass(t: number, freq: number) {
    const { ctx } = this.g;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + STEP * 1.6);
    lp.connect(this.env(t, 0.32, 0.005, STEP * 1.8, this.g.music));
    this.osc('sawtooth', freq, t, STEP * 2, lp);
  }

  private arp(t: number, freq: number) {
    const { ctx } = this.g;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const out = this.env(t, 0.06, 0.004, STEP * 1.2, this.g.music);
    out.connect(this.delayIn);
    lp.connect(out);
    this.osc('square', freq, t, STEP * 1.3, lp);
  }

  private pad(t: number, freqs: number[], dur: number) {
    const { ctx } = this.g;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const a = ctx.createGain();
    a.gain.setValueAtTime(0.0001, t);
    a.gain.linearRampToValueAtTime(0.05, t + dur * 0.3);
    a.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(a).connect(this.g.music);
    for (const f of freqs) {
      this.osc('sawtooth', f, t, dur, lp, -8);
      this.osc('sawtooth', f, t, dur, lp, 8);
    }
  }
}
