/**
 * Experimental features minimal polyfills.
 */

import type { Nullable } from '$lib/util';

export interface AudioTrackList extends EventTarget {
  readonly length: number;
  getTrackById(id: string): Nullable<AudioTrack>;
  [index: number]: AudioTrack;
  [Symbol.iterator](): IterableIterator<AudioTrack>;
}

export interface AudioTrack {
  enabled: boolean;
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly sourceBuffer: SourceBuffer;
}
