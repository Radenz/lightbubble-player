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

export interface NamedAudioTrackList extends EventTarget {
  readonly length: number;
  getTrackById(id: string): Nullable<NamedAudioTrack>;
  [index: number]: NamedAudioTrack;
  [Symbol.iterator](): IterableIterator<NamedAudioTrack>;
}

export interface VideoTrackList extends EventTarget {
  readonly length: number;
  readonly selectedIndex: number;
  getTrackById(id: string): Nullable<VideoTrack>;
  [index: number]: VideoTrack;
  [Symbol.iterator](): IterableIterator<VideoTrack>;
}

export interface NamedVideoTrackList extends EventTarget {
  readonly length: number;
  readonly selectedIndex: number;
  getTrackById(id: string): Nullable<NamedVideoTrack>;
  [index: number]: NamedVideoTrack;
  [Symbol.iterator](): IterableIterator<NamedVideoTrack>;
}

interface Track {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly sourceBuffer: SourceBuffer;
  name?: string;
}

export type AudioTrack = Track & {
  enabled: boolean;
};

export type VideoTrack = Track & {
  selected: boolean;
};

export type NamedAudioTrack = Required<AudioTrack>;

export type NamedVideoTrack = Required<VideoTrack>;
