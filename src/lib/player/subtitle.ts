import { isNumberExact } from '$lib/util';
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
type Value = number | string;

export interface SubtitlesMeta {
  external: ExternalSubtitleMeta[];
  embedded: EmbeddedSubtitleMeta[];
}

interface SubtitleStyle {
  [key: string]: Value;
}

type SubtitleEntryMeta = SubtitleStyle;

export interface SubtitleEntry {
  pts: number;
  duration: number;
  text: string;
  metadata?: SubtitleEntryMeta;
}

export interface RawSubtitle {
  // TODO: parse header
  header: string;
  lines: SubtitleEntry[];
}

interface SubtitleHeader {
  [key: string]: Value;
}

interface SubtitleStyles {
  [styleName: string]: SubtitleStyle;
}

export interface Subtitle {
  header: SubtitleHeader;
  styleFormat?: string[];
  styles: SubtitleStyles;
  lineFormat?: string[];
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

// TODO: refactor, remove duplication
export function parseSubtitle(rawSubtitle: RawSubtitle): Subtitle {
  const headerLines = rawSubtitle.header.split(/\r?\n/);
  const subtitle: Partial<Subtitle> = {};
  const header: SubtitleHeader = {};
  let index = 0;

  // Script info
  while (index < headerLines.length) {
    const headerLine = headerLines[index].trim();
    index += 1;

    if (headerLine === '[Script Info]') continue;
    if (headerLine.startsWith(';')) continue;
    if (headerLine.startsWith('[')) {
      index -= 1;
      break;
    }

    const keyValue = headerLine.split(/:\s?/);
    // Corrupted line, ignore
    if (keyValue.length !== 2) continue;

    const [key, value] = keyValue;
    header[key] = value;
  }

  subtitle.header = header;
  let nameIndex = -1;
  let fallbackIndex = 0;
  const styles: SubtitleStyles = {};

  // Styles
  while (index < headerLines.length) {
    const headerLine = headerLines[index].trim();
    index += 1;

    if (headerLine === '[V4 Styles]' || headerLine === '[V4+ Styles]') continue;
    if (headerLine.startsWith(';')) continue;
    if (headerLine.startsWith('[')) {
      index -= 1;
      break;
    }

    const keyValue = headerLine.split(/:\s?/);
    // Corrupted line, ignore
    if (keyValue.length !== 2) continue;

    const [key, value] = keyValue;

    if (key === 'Format') {
      subtitle.styleFormat = value.split(/,\s?/);
      if (subtitle.styleFormat?.includes('Name')) {
        nameIndex = subtitle.styleFormat.indexOf('Name');
      }
    }

    if (key === 'Style') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const convertedValue: Value[] = [];
      const valueArray = value.split(/,\s?/);

      for (const value of valueArray) {
        convertedValue.push(isNumberExact(value) ? parseFloat(value) : value);
      }

      const name = nameIndex >= 0 ? convertedValue[nameIndex] : `${fallbackIndex}`;
      fallbackIndex++;

      styles[name] = {};

      if (subtitle.styleFormat) {
        convertedValue.forEach((value, index) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const key = subtitle.styleFormat![index];
          styles[name][key] = value;
        });
      }
    }
  }

  subtitle.styles = styles;

  // Line format
  while (index < headerLines.length) {
    const headerLine = headerLines[index].trim();
    index += 1;

    if (headerLine === '[Events]') continue;
    if (headerLine.startsWith(';')) continue;
    if (headerLine.startsWith('[')) {
      index -= 1;
      break;
    }

    const keyValue = headerLine.split(/:\s?/);
    // Corrupted line, ignore
    if (keyValue.length !== 2) continue;

    const [key, value] = keyValue;

    if (key === 'Format') {
      // ? Libav dumps Start and End event line data for some reason
      subtitle.lineFormat = value
        .split(/,\s?/)
        .filter((formatKey) => !['Start', 'End'].includes(formatKey));

      break;
    }
  }

  subtitle.lines = rawSubtitle.lines;
  console.log(subtitle);

  for (const entry of subtitle.lines) {
    parseSubtitleEntryMetadata(entry, subtitle.lineFormat);
  }

  return subtitle as Subtitle;
}

function parseSubtitleEntryMetadata(entry: SubtitleEntry, format?: string[]) {
  if (format) {
    const rawValues = entry.text.split(/,\s?/);

    // Corrupted line, ignore
    // ? Libav inserts an index at the beginning of the event line for some reason
    if (rawValues.length + 1 < format.length) {
      return;
    }

    const values = rawValues.map((value) => {
      return isNumberExact(value) ? parseFloat(value) : value;
    });

    // ? Remove the index inserted by libav
    values.splice(0, 1);

    if (!entry.metadata) {
      entry.metadata = {};
    }

    values.forEach((value, index) => {
      const key = format[index];
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      entry.metadata![key] = value;
    });
    if (Object.keys(entry.metadata).includes('Text')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      entry.text = entry.metadata!['Text'] + '';
    }
  }
}

/**
 * [Script Info]
; Script generated by FFmpeg/Lavc58.134.100
ScriptType: v4.00+
PlayResX: 384
PlayResY: 288
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,16,&Hffffff,&Hffffff,&H0,&H0,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text

 */
