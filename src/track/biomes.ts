// Per-stage looks: road/ground colors are read per segment, so the next biome's road shows up
// ahead of you before the checkpoint; sky, sun and mountains crossfade when you cross it.

export type BiomeId = 'coast' | 'boulevard' | 'canyon' | 'desert' | 'city' | 'forest' | 'alpine' | 'bay';

export interface Biome {
  fog: string;
  ground: string;
  grid: string;
  roadLight: string;
  roadDark: string;
  rumbleLight: string;
  rumbleDark: string;
  lane: string;
  skyStops: [number, string][];
  /** sun gradient top → bottom, and its glow */
  sun: [string, string, string];
  sunGlow: string;
  /** far and near mountain fills (top, bottom) and outline colors */
  far: [string, string, string];
  near: [string, string, string];
  horizonGlow: string;
  stars: number;
}

export const BIOMES: Record<BiomeId, Biome> = {
  coast: {
    fog: '#2b0b4f',
    ground: '#12042a',
    grid: '#e93fd3',
    roadLight: '#2a1748',
    roadDark: '#25133f',
    rumbleLight: '#ff2a6d',
    rumbleDark: '#05d9e8',
    lane: '#d8f6ff',
    skyStops: [
      [0, '#05010f'],
      [0.45, '#1d0640'],
      [0.75, '#5b0f6b'],
      [0.92, '#c2237a'],
      [1, '#ff6b5a'],
    ],
    sun: ['#fff3a3', '#ffb347', '#ff2a6d'],
    sunGlow: '255,80,150',
    far: ['#3a0f63', '#1c0638', '#ff4fd8'],
    near: ['#1d0638', '#12042a', '#05d9e8'],
    horizonGlow: '255,107,213',
    stars: 140,
  },
  boulevard: {
    fog: '#3a0a45',
    ground: '#1a0326',
    grid: '#ff5ec4',
    roadLight: '#331a4a',
    roadDark: '#2b1540',
    rumbleLight: '#ffe66d',
    rumbleDark: '#ff2a6d',
    lane: '#fff3d0',
    skyStops: [
      [0, '#0a0118'],
      [0.4, '#2e0848'],
      [0.7, '#8a1670'],
      [0.9, '#ff4f7a'],
      [1, '#ffa34f'],
    ],
    sun: ['#fffbd0', '#ffd36b', '#ff4f7a'],
    sunGlow: '255,120,120',
    far: ['#5a1060', '#2a0638', '#ffb0e8'],
    near: ['#2a0638', '#1a0326', '#ffe66d'],
    horizonGlow: '255,150,150',
    stars: 80,
  },
  canyon: {
    fog: '#4a1210',
    ground: '#1f0807',
    grid: '#ff6a3d',
    roadLight: '#3a1d1d',
    roadDark: '#321818',
    rumbleLight: '#ffb347',
    rumbleDark: '#ff3d3d',
    lane: '#ffe9cf',
    skyStops: [
      [0, '#0d0204'],
      [0.45, '#3a0a14'],
      [0.75, '#8a1f1a'],
      [0.92, '#e8542a'],
      [1, '#ffb347'],
    ],
    sun: ['#fff1c4', '#ffb347', '#e8342a'],
    sunGlow: '255,110,60',
    far: ['#6e1f1a', '#3a0d0d', '#ff8a4d'],
    near: ['#3a0d0d', '#1f0807', '#ffcf6d'],
    horizonGlow: '255,140,80',
    stars: 60,
  },
  desert: {
    fog: '#3d1a3a',
    ground: '#1f0f12',
    grid: '#ffb347',
    roadLight: '#33223a',
    roadDark: '#2c1d33',
    rumbleLight: '#ffe66d',
    rumbleDark: '#ff2a6d',
    lane: '#fff3d0',
    skyStops: [
      [0, '#06051c'],
      [0.45, '#1c1048'],
      [0.75, '#5e1f6b'],
      [0.92, '#d9566a'],
      [1, '#ffb347'],
    ],
    sun: ['#fff8c8', '#ffd36b', '#ff7a4a'],
    sunGlow: '255,170,90',
    far: ['#4a2050', '#24102e', '#ffb347'],
    near: ['#24102e', '#1f0f12', '#ff7a4a'],
    horizonGlow: '255,180,110',
    stars: 160,
  },
  city: {
    fog: '#0d1640',
    ground: '#050a1f',
    grid: '#05d9e8',
    roadLight: '#18183a',
    roadDark: '#141432',
    rumbleLight: '#05d9e8',
    rumbleDark: '#ff2a6d',
    lane: '#d8f6ff',
    skyStops: [
      [0, '#01010a'],
      [0.45, '#0a0a2e'],
      [0.75, '#2a1d7a'],
      [0.92, '#7a2ab8'],
      [1, '#ff4fd8'],
    ],
    sun: ['#d8fbff', '#7af0ff', '#b84fff'],
    sunGlow: '120,120,255',
    far: ['#1a1a5a', '#0a0a2e', '#7a8aff'],
    near: ['#0a0a2e', '#050a1f', '#05d9e8'],
    horizonGlow: '90,200,255',
    stars: 50,
  },
  forest: {
    fog: '#06303a',
    ground: '#03140f',
    grid: '#2affc6',
    roadLight: '#132a2a',
    roadDark: '#0f2323',
    rumbleLight: '#2affc6',
    rumbleDark: '#ff2a6d',
    lane: '#d8fff0',
    skyStops: [
      [0, '#01060a'],
      [0.45, '#04202e'],
      [0.75, '#0b4a5a'],
      [0.92, '#1f9a8a'],
      [1, '#a8ff9e'],
    ],
    sun: ['#f6ffd0', '#a8ff9e', '#2affc6'],
    sunGlow: '80,255,190',
    far: ['#0b3d4a', '#04202e', '#2affc6'],
    near: ['#04202e', '#03140f', '#a8ff9e'],
    horizonGlow: '80,255,190',
    stars: 180,
  },
  alpine: {
    fog: '#1f2a66',
    ground: '#0a0f2a',
    grid: '#8ad8ff',
    roadLight: '#232a52',
    roadDark: '#1d2447',
    rumbleLight: '#ffffff',
    rumbleDark: '#4a7aff',
    lane: '#ffffff',
    skyStops: [
      [0, '#03040f'],
      [0.45, '#0f1645'],
      [0.75, '#2a3a8a'],
      [0.92, '#6a8ad8'],
      [1, '#d8e8ff'],
    ],
    sun: ['#ffffff', '#d8f0ff', '#8aa8ff'],
    sunGlow: '170,200,255',
    far: ['#c8d8ff', '#4a5aa8', '#ffffff'],
    near: ['#2a3a7a', '#0a0f2a', '#8ad8ff'],
    horizonGlow: '170,210,255',
    stars: 200,
  },
  bay: {
    fog: '#5a1a52',
    ground: '#1a0626',
    grid: '#ff9ed8',
    roadLight: '#3a1d4a',
    roadDark: '#321842',
    rumbleLight: '#ffd36b',
    rumbleDark: '#05d9e8',
    lane: '#fff3f8',
    skyStops: [
      [0, '#12031f'],
      [0.4, '#4a0f5a'],
      [0.7, '#c2237a'],
      [0.88, '#ff6b9a'],
      [1, '#ffd36b'],
    ],
    sun: ['#fffde0', '#ffe08a', '#ff6b9a'],
    sunGlow: '255,160,140',
    far: ['#7a1f6b', '#3a0a45', '#ffd36b'],
    near: ['#3a0a45', '#1a0626', '#ff9ed8'],
    horizonGlow: '255,190,160',
    stars: 40,
  },
};
