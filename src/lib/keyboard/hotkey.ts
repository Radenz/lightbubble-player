import Mousetrap from 'mousetrap';

export function register(
  keys: string | string[],
  callback: (e: Mousetrap.ExtendedKeyboardEvent, combo: string) => boolean | void,
  action?: string
) {
  if (typeof keys === 'string') {
    keys = keys.toLowerCase();
  } else {
    keys = keys.map((value) => value.toLowerCase());
  }

  Mousetrap.bind(keys, callback, action);
}

export function unregister(keys: string | string[], action?: string) {
  if (typeof keys === 'string') {
    keys = keys.toLowerCase();
  } else {
    keys = keys.map((value) => value.toLowerCase());
  }

  Mousetrap.unbind(keys, action);
}

export function registerRaw(
  keys: string | string[],
  callback: (e: Mousetrap.ExtendedKeyboardEvent, combo: string) => boolean | void,
  action?: string
) {
  Mousetrap.bind(keys, callback, action);
}

export function unregisterRaw(keys: string | string[], action?: string) {
  Mousetrap.unbind(keys, action);
}
