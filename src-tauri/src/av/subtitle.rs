use super::{codec::get_subtitle_decoder, util::timestamp_to_seconds, StreamExt, StreamKind};
use crate::prelude::*;
use ffmpeg::{decoder, subtitle::Rect, time, Subtitle};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SubtitleEntry {
    pub pts: f64,
    pub duration: f64,
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct ParsedSubtitle {
    // TODO: parse header
    pub header: String,
    pub lines: Vec<SubtitleEntry>,
}

#[tauri::command]
pub fn get_embedded_subtitle(path: String, index: usize) -> Option<ParsedSubtitle> {
    let maybe_input = ffmpeg_next::format::input(&path);
    let Ok(mut input) = maybe_input else {
        return None;
    };

    let maybe_stream = input.streams().find(|stream| stream.index() == index);
    let Some(stream) = maybe_stream else {
        return None;
    };

    if stream.kind() != StreamKind::Subtitle {
        return None;
    }

    // let time_base = input.
    let mut decoder = get_subtitle_decoder(stream).expect("BUG: this should never panic");
    let header = get_subtitle_header(&decoder);
    let mut lines = vec![];

    let mut subtitle = Subtitle::new();
    for (stream, mut packet) in input.packets() {
        if stream.index() == index {
            let time_base = stream.time_base();
            decoder.decode(&packet, &mut subtitle);
            let pts = packet.pts().unwrap_or(i64::MAX);
            let duration = packet.duration();
            let mut texts: Vec<String> = vec![];

            for rect in subtitle.rects() {
                match rect {
                    Rect::Ass(text) => texts.push(text.get().into()),
                    Rect::Text(text) => texts.push(text.get().into()),
                    _ => (),
                }
            }

            dbg!(time_base);

            let text = texts.join("\n");

            let pts = timestamp_to_seconds(pts, time_base);
            let duration = timestamp_to_seconds(duration, time_base);
            dbg!(pts);
            dbg!(duration);

            lines.push(SubtitleEntry {
                pts,
                duration,
                text,
            });
        }
    }

    Some(ParsedSubtitle { header, lines })
}

pub fn get_subtitle_header(decoder: &decoder::Subtitle) -> String {
    unsafe {
        let header_ptr = (*decoder.as_ptr()).subtitle_header;
        let header_c = std::ffi::CStr::from_ptr(header_ptr as *const i8);
        let header = header_c.to_str().expect("encoding error");
        header.to_owned()
    }
}
