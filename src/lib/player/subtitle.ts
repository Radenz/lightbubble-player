// TODO: add more format supported by libavcodec
export const SUPPORTED_SUBTITLE_FORMATS = ['ass', 'srt', 'vtt'] as const;
export type SubtitleFormat = (typeof SUPPORTED_SUBTITLE_FORMATS)[number];

export interface ExternalSubtitleMeta {
  path: string;
  ext: SubtitleFormat;
  basename: string;
}

export type EmbeddedSubtitleMeta = StreamMeta;

export interface SubtitlesMeta {
  external: ExternalSubtitleMeta[];
  embedded: EmbeddedSubtitleMeta[];
}

export function isSubtitleSupported(format: string): format is SubtitleFormat {
  return SUPPORTED_SUBTITLE_FORMATS.includes(format as SubtitleFormat);
}

// NOTE: maybe consider supporting local locales
const LANGUAGE_NAME = new Intl.DisplayNames(['en'], {
  type: 'language'
});

export function labelOf(meta: EmbeddedSubtitleMeta, fallbackId: number): string {
  if (!meta['language']) {
    return `Track ${fallbackId}`;
  }

  try {
    const language = LANGUAGE_NAME.of(meta['language'].toString());
    if (!language) throw '';

    if (meta['title']) {
      const title = meta['title'] as string;
      if (title.includes(language)) return title;
      return `${language} (${title})`;
    }
    return language;
  } catch (_) {
    return `Track ${fallbackId}`;
  }
}
