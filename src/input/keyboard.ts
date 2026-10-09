import type { InputState } from '../types';

export type Action = 'start' | 'mute' | 'pause';

const KEYS: Record<string, keyof InputState> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'faster',
  KeyW: 'faster',
  ArrowDown: 'slower',
  KeyS: 'slower',
};

const ACTIONS: Record<string, Action> = {
  Enter: 'start',
  Space: 'start',
  KeyM: 'mute',
  KeyP: 'pause',
  Escape: 'pause',
};

export function createKeyboard(onAction: (a: Action) => void): InputState {
  const input: InputState = { left: false, right: false, faster: false, slower: false };

  window.addEventListener('keydown', (e) => {
    const key = KEYS[e.code];
    if (key) {
      input[key] = true;
      e.preventDefault();
      return;
    }
    const action = ACTIONS[e.code];
    if (action && !e.repeat) {
      onAction(action);
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    const key = KEYS[e.code];
    if (key) input[key] = false;
  });
  // don't leave keys stuck down when the window loses focus
  window.addEventListener('blur', () => {
    input.left = input.right = input.faster = input.slower = false;
  });
  return input;
}
