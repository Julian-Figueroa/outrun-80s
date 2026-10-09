import type { GameEvent } from '../game/state';
import { Engine, playSfx } from './engine';
import type { AudioGraph } from './graph';
import { Music, type Song } from './music';

/** owns the AudioContext; nothing is created until the first user gesture */
export class AudioSystem {
  private graph: AudioGraph | null = null;
  private master: GainNode | null = null;
  private musicPlayer: Music | null = null;
  private engine: Engine | null = null;
  muted = false;

  unlock(): void {
    if (!this.graph) {
      let ctx: AudioContext;
      try {
        ctx = new AudioContext();
      } catch {
        return;
      }
      const comp = ctx.createDynamicsCompressor();
      comp.connect(ctx.destination);
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.8;
      master.connect(comp);
      const music = ctx.createGain();
      music.gain.value = 0.55;
      music.connect(master);
      const sfx = ctx.createGain();
      sfx.gain.value = 0.8;
      sfx.connect(master);
      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.master = master;
      this.graph = { ctx, music, sfx, noise };
    }
    if (this.graph.ctx.state === 'suspended') void this.graph.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.graph && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.graph.ctx.currentTime, 0.05);
    return this.muted;
  }

  /** plays `song`, switching (from the top) if another one is on */
  playMusic(song: Song): void {
    if (!this.graph) return;
    this.musicPlayer ??= new Music(this.graph);
    this.musicPlayer.play(song);
  }

  get unlocked(): boolean {
    return this.graph !== null;
  }

  suspend(on: boolean): void {
    if (!this.graph) return;
    void (on ? this.graph.ctx.suspend() : this.graph.ctx.resume());
  }

  handle(e: GameEvent): void {
    if (this.graph) playSfx(this.graph, e);
  }

  updateEngine(speedPercent: number, throttle: boolean, running: boolean): void {
    if (!this.graph) return;
    this.engine ??= new Engine(this.graph);
    this.engine.update(speedPercent, throttle, running);
  }
}
