import type { Subtitle } from '$lib/player/subtitle';
import type { Nullable } from '$lib/util';
import { bridge } from './bridge';

// TODO: refactor current stores
export const playbackDuration = bridge(-1);
export const displayDuration = bridge('0:00');
export const playbackTime = bridge(0);
export const displayTime = bridge('0:00');
export const paused = bridge(false);
export const ended = bridge(false);
export const fullscreen = bridge(false);

export const activeSubtitle = bridge(null as Nullable<Subtitle>);
export const subtitleDisplay = bridge('');
