// TODO: add more format supported by libavcodec
export const SUPPORTED_SUBTITLE_FORMATS = ['ass', 'srt', 'vtt'] as const;
export type SubtitleFormat = (typeof SUPPORTED_SUBTITLE_FORMATS)[number];

export interface ExternalSubtitleMeta {
  path: string;
  ext: string;
  basename: string;
}

// TODO: store more appropriate info from subtitle stream metadata
export type EmbeddedSubtitleMeta = StreamMeta;
