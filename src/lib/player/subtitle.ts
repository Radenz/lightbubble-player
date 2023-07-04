import slugify from 'slugify';

// TODO: add more format supported by libavcodec
export const SUPPORTED_SUBTITLE_FORMATS = ['ass', 'srt', 'vtt'] as const;
export type SubtitleFormat = (typeof SUPPORTED_SUBTITLE_FORMATS)[number];

export interface ExternalSubtitleMeta {
  path: string;
  ext: SubtitleFormat;
  basename: string;
}

export type EmbeddedSubtitleMeta = StreamMeta;
export type SubtitleMeta = EmbeddedSubtitleMeta | ExternalSubtitleMeta;

export interface SubtitlesMeta {
  external: ExternalSubtitleMeta[];
  embedded: EmbeddedSubtitleMeta[];
}

export interface SubtitleEntry {
  pts: number;
  duration: number;
  text: string;
}

export interface Subtitle {
  // TODO: parse header
  header: string;
  lines: SubtitleEntry[];
}

export function isSubtitleSupported(format: string): format is SubtitleFormat {
  return SUPPORTED_SUBTITLE_FORMATS.includes(format as SubtitleFormat);
}

// NOTE: maybe consider supporting local locales
const LANGUAGE_NAME = new Intl.DisplayNames(['en'], {
  type: 'language'
});

function normalize(string: string) {
  return slugify(string, ' ');
}

export function labelOf(meta: EmbeddedSubtitleMeta, fallbackId: number): string {
  if (!meta['language']) {
    return `Track ${fallbackId}`;
  }

  try {
    const language = LANGUAGE_NAME.of(meta['language'].toString());
    if (!language) throw '';

    if (meta['title']) {
      const title = meta['title'] as string;
      const normalizedLanguage = normalize(language);
      const normalizedTitle = normalize(title);
      // FIXME: consider language is substring of title,
      // but contains non latin characters
      if (normalizedTitle === normalizedLanguage) return language;
      return `${language} (${title})`;
    }
    return language;
  } catch (_) {
    return `Track ${fallbackId}`;
  }
}

export function isEmbedded(meta: SubtitleMeta): meta is EmbeddedSubtitleMeta {
  return !isExternal(meta);
}

export function isExternal(meta: SubtitleMeta): meta is ExternalSubtitleMeta {
  return !!meta.path;
}
