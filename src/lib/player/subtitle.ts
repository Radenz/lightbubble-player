// TODO: add more format supported by libavcodec
export const SUPPORTED_SUBTITLE_FORMATS = ['ass', 'srt', 'vtt'];

export interface SubtitleMeta {
  path: string;
  ext: string;
  basename: string;
}
