import { mtof, type AudioGraph } from './graph';

const LOOKAHEAD = 0.12;

/** one 4-bar loop; every bar is 16 sixteenth steps */
export interface Song {
  title: string;
  bpm: number;
  chords: number[][];
  /** bass root (MIDI) per bar */
  roots: number[];
  /** per 16th step: semitones above the root for a bass note, or null for a rest */
  bassline: (number | null)[];
  /** per 16th step: index into the chord tones (chord + its root/third an octave up), or null */
  arp: (number | null)[];
  /** 'pad' holds the chord through the bar; 'stabs' plays short off-beat chords */
  harmony: 'pad' | 'stabs';
  /** 16th steps with a kick; snare is on 2 and 4 */
  kicks: number[];
  /** hats on every 16th instead of off-beat 8ths */
  busyHats: boolean;
}

const _ = null;

export const SONGS: Song[] = [
  {
    // i–VI–III–VII in A minor: Am F C G
    title: 'MAGENTA DRIVE',
    bpm: 100,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [48, 52, 55],
      [55, 59, 62],
    ],
    roots: [33, 29, 36, 31],
    bassline: [0, _, 12, _, 0, _, 12, _, 0, _, 12, _, 0, _, 12, _],
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 3],
    harmony: 'pad',
    kicks: [0, 4, 8, 12],
    busyHats: false,
  },
  {
    // Dm9–G9–Cmaj7–Am7, funk bass and off-beat stabs
    title: 'PALM GROOVE',
    bpm: 112,
    chords: [
      [62, 65, 69, 72],
      [59, 62, 65, 69],
      [59, 64, 67, 71],
      [57, 60, 64, 67],
    ],
    roots: [38, 31, 36, 33],
    bassline: [0, _, 12, 0, _, 0, 12, _, 0, _, 10, 12, _, 7, _, 12],
    arp: [_, _, 4, _, _, 2, _, _, 4, _, _, 3, _, 1, _, _],
    harmony: 'stabs',
    kicks: [0, 6, 8, 14],
    busyHats: true,
  },
  {
    // Em–C–G–D at a driving tempo
    title: 'NIGHT CIRCUIT',
    bpm: 124,
    chords: [
      [52, 55, 59],
      [48, 52, 55],
      [55, 59, 62],
      [50, 54, 57],
    ],
    roots: [28, 24, 31, 26],
    bassline: [0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0, 0, 12, 7, 12],
    arp: [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 4, 2, 1, 3, 4, 3],
    harmony: 'pad',
    kicks: [0, 4, 8, 12],
    busyHats: true,
  },
];

/** lookahead step sequencer looping a song (8 bars: the second 4 play the arp an octave up) */
export class Music {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private song: Song = SONGS[0];
  private readonly delay: DelayNode;
  private readonly delayIn: GainNode;
  /** each play() gets a fresh bus so stopping can fade out notes that are already scheduled */
  private bus: GainNode;

  constructor(private readonly g: AudioGraph) {
    const { ctx } = g;
    this.bus = ctx.createGain();
    this.delay = ctx.createDelay(1);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.delayIn = ctx.createGain();
    this.delayIn.connect(this.delay);
    this.delay.connect(feedback).connect(this.delay);
    this.delay.connect(wet).connect(g.music);
  }

  private get stepTime(): number {
    return 60 / this.song.bpm / 4;
  }

  /** (re)starts playback; switching to a different song restarts it from the top */
  play(song: Song): void {
    if (this.timer !== null && song === this.song) return;
    this.stop();
    const { ctx } = this.g;
    this.song = song;
    this.delay.delayTime.setValueAtTime(this.stepTime * 3, ctx.currentTime);
    this.bus = ctx.createGain();
    this.bus.connect(this.g.music);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    // silence anything already scheduled past this point, then let the old bus go
    const { ctx } = this.g;
    const old = this.bus;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    window.setTimeout(() => old.disconnect(), 500);
  }

  private tick(): void {
    const { ctx } = this.g;
    // after a suspend, skip ahead instead of firing a burst of stale notes
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.schedule(this.step, this.nextTime);
      this.nextTime += this.stepTime;
      this.step = (this.step + 1) % 128;
    }
  }

  private schedule(step: number, t: number): void {
    const song = this.song;
    const STEP = this.stepTime;
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const phrase = Math.floor(step / 64); // second 4 bars: arp up an octave
    const chord = song.chords[bar];

    if (song.kicks.includes(s)) this.kick(t);
    if (s === 4 || s === 12) this.snare(t);
    if (song.busyHats) this.hat(t, s % 4 === 2 ? 0.06 : 0.025);
    else if (s % 2 === 1) this.hat(t, s % 4 === 3 ? 0.06 : 0.035);

    const bass = song.bassline[s];
    if (bass !== null) this.bass(t, mtof(song.roots[bar] + bass), STEP);

    const arp = song.arp[s];
    const tones = [...chord, chord[0] + 12, chord[1] + 12];
    if (arp !== null) this.arp(t, mtof(tones[arp % tones.length] + 12 * phrase), STEP);

    if (song.harmony === 'pad' && s === 0) this.pad(t, chord.map(mtof), STEP * 16);
    if (song.harmony === 'stabs' && (s === 2 || s === 7 || s === 10)) this.stab(t, chord.map(mtof), STEP);
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
    o.connect(this.env(t, 0.9, 0.003, 0.28, this.bus));
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
    const out = this.env(t, 0.45, 0.002, 0.2, this.bus);
    out.connect(this.delayIn);
    src.connect(bp).connect(out);
    src.start(t);
    src.stop(t + 0.25);
    this.osc('triangle', 190, t, 0.08, this.env(t, 0.3, 0.002, 0.08, this.bus));
  }

  private hat(t: number, vol: number) {
    const { ctx } = this.g;
    const src = ctx.createBufferSource();
    src.buffer = this.g.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    src.connect(hp).connect(this.env(t, vol, 0.002, 0.04, this.bus));
    src.start(t);
    src.stop(t + 0.08);
  }

  private bass(t: number, freq: number, STEP: number) {
    const { ctx } = this.g;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 6;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + STEP * 1.6);
    lp.connect(this.env(t, 0.32, 0.005, STEP * 1.8, this.bus));
    this.osc('sawtooth', freq, t, STEP * 2, lp);
  }

  private arp(t: number, freq: number, STEP: number) {
    const { ctx } = this.g;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const out = this.env(t, 0.06, 0.004, STEP * 1.2, this.bus);
    out.connect(this.delayIn);
    lp.connect(out);
    this.osc('square', freq, t, STEP * 1.3, lp);
  }

  private stab(t: number, freqs: number[], STEP: number) {
    const { ctx } = this.g;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + STEP * 1.5);
    const out = this.env(t, 0.05, 0.004, STEP * 1.5, this.bus);
    out.connect(this.delayIn);
    lp.connect(out);
    for (const f of freqs) this.osc('sawtooth', f, t, STEP * 1.6, lp, 6);
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
    lp.connect(a).connect(this.bus);
    for (const f of freqs) {
      this.osc('sawtooth', f, t, dur, lp, -8);
      this.osc('sawtooth', f, t, dur, lp, 8);
    }
  }
}
