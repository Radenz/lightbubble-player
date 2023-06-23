/**
 * This is an equivalent of stream related type definitions
 * on the rust backend.
 * @see av.rs
 */

interface StreamMeta {
  id: number;
  index: number;
  [key: string]: string | number;
}

interface Streams {
  video: StreamMeta[];
  audio: StreamMeta[];
  subtitle: StreamMeta[];
}
