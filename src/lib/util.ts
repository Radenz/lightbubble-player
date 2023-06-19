export type Listener<T> = (event: T) => unknown;
export interface ListenerMap<T> {
  [key: number]: Listener<T>;
}

export type Nullable<T> = T | null;

const HOUR_SECONDS = 3600;
const MINUTE_SECONDS = 60;

export function toDurationString(duration: number): string {
  let durationString = '';

  const hour = Math.floor(duration / HOUR_SECONDS);
  duration %= HOUR_SECONDS;
  const minutes = Math.floor(duration / MINUTE_SECONDS);
  duration %= MINUTE_SECONDS;
  const seconds = duration;

  if (hour > 0) {
    durationString += `${hour}:`;
  }

  const minuteStringLength = hour > 0 ? 2 : 0;
  const minuteString = minutes.toString().padStart(minuteStringLength, '0');
  durationString += `${minuteString}:`;
  const secondString = seconds.toString().padStart(2, '0');
  durationString += `${secondString}`;

  return durationString;
}

/**
 * Alias for built-in template literal. Used to scope
 * tailwind intellisense in ts strings.
 */
export function tw(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw({ raw: strings }, ...values);
}
