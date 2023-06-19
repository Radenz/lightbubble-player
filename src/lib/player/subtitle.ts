// TODO: add more format supported by libavcodec
export const SUPPORTED_SUBTITLE_FORMATS = ['ass', 'srt', 'vtt'] as const;
export type SubtitleFormat = (typeof SUPPORTED_SUBTITLE_FORMATS)[number];

export interface ExternalSubtitleMeta {
  path: string;
  ext: SubtitleFormat;
  basename: string;
}

// TODO: store more appropriate info from subtitle stream metadata
export type EmbeddedSubtitleMeta = StreamMeta;

export interface SubtitlesMeta {
  external: ExternalSubtitleMeta[];
  embedded: EmbeddedSubtitleMeta[];
}

export function isSubtitleSupported(format: string): format is SubtitleFormat {
  return SUPPORTED_SUBTITLE_FORMATS.includes(format as SubtitleFormat);
}
