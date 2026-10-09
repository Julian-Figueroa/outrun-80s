export interface AudioGraph {
  ctx: AudioContext;
  music: GainNode;
  sfx: GainNode;
  noise: AudioBuffer;
}

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
