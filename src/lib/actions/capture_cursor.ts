import type { ActionReturn } from 'svelte/action';
import { get, type Writable } from 'svelte/store';

/**
 * Detects cursor entering & leaving a node.
 */
export function captureCursor(
  node: HTMLElement,
  inside: Writable<boolean>
): ActionReturn<Writable<boolean>> {
  let cursorInside = inside;

  function onEnter() {
    cursorInside.set(true);
  }

  function onLeave() {
    cursorInside.set(false);
  }

  node.addEventListener('mouseenter', onEnter);
  node.addEventListener('mouseleave', onLeave);

  return {
    update(inside) {
      inside.set(get(cursorInside));
      cursorInside = inside;
    },
    destroy() {
      node.removeEventListener('mouseenter', onEnter);
      node.removeEventListener('mouseleave', onLeave);
    }
  };
}
