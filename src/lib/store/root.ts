import type { Nullable } from '$lib/util';
import { writable } from 'svelte/store';

export const rootElement = writable<Nullable<HTMLElement>>(null);
