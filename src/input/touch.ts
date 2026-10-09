import type { InputState } from '../types';
import { NAV, type Action } from './keyboard';

/** wires the on-screen pads (index.html #touch) and tap-to-start on the canvas */
export function createTouch(canvas: HTMLCanvasElement, onAction: (a: Action) => void): InputState {
  const input: InputState = { left: false, right: false, faster: false, slower: false };

  document.querySelectorAll<HTMLButtonElement>('#touch [data-key]').forEach((btn) => {
    const key = btn.dataset.key as keyof InputState;
    const set = (on: boolean) => (e: PointerEvent) => {
      if (on && !input[key]) onAction(NAV[key]);
      input[key] = on;
      btn.classList.toggle('on', on);
      if (on) btn.setPointerCapture(e.pointerId);
      e.preventDefault();
    };
    btn.addEventListener('pointerdown', set(true));
    btn.addEventListener('pointerup', set(false));
    btn.addEventListener('pointercancel', set(false));
    btn.addEventListener('lostpointercapture', set(false));
  });

  document.querySelectorAll<HTMLButtonElement>('#touch [data-action]').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => {
      onAction(btn.dataset.action as Action);
      e.preventDefault();
    });
  });

  canvas.addEventListener('pointerdown', (e) => {
    onAction('start');
    e.preventDefault();
  });

  return input;
}
