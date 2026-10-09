import type { InputState } from '../types';
import type { Action, Nav } from './keyboard';

// standard mapping (https://w3c.github.io/gamepad/#remapping)
const A = 0;
const B = 1;
const X = 2;
const LT = 6;
const RT = 7;
const BACK = 8;
const START = 9;
const UP = 12;
const DOWN = 13;
const LEFT = 14;
const RIGHT = 15;

const STEER_DEADZONE = 0.3;
/** stick needs to pass NAV_ON to fire a menu press, and come back under NAV_OFF before the next */
const NAV_ON = 0.6;
const NAV_OFF = 0.35;

export interface Gamepad {
  input: InputState;
  /** call once per update; reads every connected pad and fires actions on button presses */
  poll(): void;
  rumble(strong: number, weak: number, ms: number): void;
  readonly connected: boolean;
}

interface Actuator {
  playEffect?(type: string, params: Record<string, number>): Promise<unknown>;
}

export function createGamepad(onAction: (a: Action) => void): Gamepad {
  const input: InputState = { left: false, right: false, faster: false, slower: false };
  const held = new Set<string>();
  let pads: globalThis.Gamepad[] = [];

  const edge = (id: string, down: boolean, action: Action) => {
    if (down && !held.has(id)) onAction(action);
    if (down) held.add(id);
    else held.delete(id);
  };

  return {
    input,
    get connected() {
      return pads.length > 0;
    },
    poll() {
      input.left = input.right = input.faster = input.slower = false;
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      pads = navigator.getGamepads().filter((p): p is globalThis.Gamepad => !!p && p.connected);
      for (const pad of pads) {
        const pressed = (i: number, threshold = 0.3) => {
          const b = pad.buttons[i];
          return !!b && (b.pressed || b.value > threshold);
        };
        const x = pad.axes[0] ?? 0;
        const y = pad.axes[1] ?? 0;
        input.left ||= x < -STEER_DEADZONE || pressed(LEFT);
        input.right ||= x > STEER_DEADZONE || pressed(RIGHT);
        input.faster ||= pressed(A) || pressed(RT);
        input.slower ||= pressed(B) || pressed(X) || pressed(LT);

        const id = (k: string) => `${pad.index}:${k}`;
        edge(id('a'), pressed(A), 'start');
        edge(id('start'), pressed(START), 'menu');
        edge(id('back'), pressed(BACK), 'mute');
        const dirs: [Nav, boolean, boolean][] = [
          ['left', pressed(LEFT), x < -NAV_ON],
          ['right', pressed(RIGHT), x > NAV_ON],
          ['up', pressed(UP), y < -NAV_ON],
          ['down', pressed(DOWN), y > NAV_ON],
        ];
        for (const [nav, button, stick] of dirs) {
          edge(id(nav), button, nav);
          const stickId = id(`stick-${nav}`);
          const axis = nav === 'left' || nav === 'right' ? Math.abs(x) : Math.abs(y);
          if (stick && !held.has(stickId)) {
            held.add(stickId);
            onAction(nav);
          } else if (axis < NAV_OFF) held.delete(stickId);
        }
      }
    },
    rumble(strong, weak, ms) {
      for (const pad of pads) {
        const actuator = (pad as unknown as { vibrationActuator?: Actuator }).vibrationActuator;
        void actuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch(
          () => {},
        );
      }
    },
  };
}
