#![allow(unused)]

use crate::prelude::*;
use std::{fs, path::Path};

use ffmpeg::codec::context::Context;
use ffmpeg::format::stream::Stream;
use ffmpeg::{media, subtitle::Rect, Frame, Subtitle};
use ffmpeg_next as ffmpeg;
use serde::Serialize;

#[derive(Serialize)]
pub struct Streams {
    pub video: Vec<StreamMeta>,
    pub audio: Vec<StreamMeta>,
    pub subtitle: Vec<StreamMeta>,
}

impl Streams {
    pub fn new() -> Self {
        Self {
            video: Vec::new(),
            audio: Vec::new(),
            subtitle: Vec::new(),
        }
    }

    pub fn add_video(&mut self, stream: StreamMeta) {
        self.video.push(stream)
    }

    pub fn add_audio(&mut self, stream: StreamMeta) {
        self.audio.push(stream)
    }

    pub fn add_subtitle(&mut self, stream: StreamMeta) {
        self.subtitle.push(stream)
    }
}

#[derive(Serialize)]
pub struct StreamMeta {
    id: i32,
    index: usize,
}

impl StreamMeta {
    pub fn new(id: i32, index: usize) -> Self {
        Self { id, index }
    }
}

pub enum StreamKind {
    Video,
    Audio,
    Subtitle,
    Unknown,
}

#[tauri::command]
pub fn discover_streams(path: String) -> Streams {
    let context = ffmpeg::format::input(&path);
    if let Err(_) = context {
        return Streams::new();
    }

    let mut context = context.unwrap();
    let mut streams = Streams::new();

    for stream in context.streams() {
        let meta = stream.meta();
        match stream.kind() {
            StreamKind::Video => streams.add_video(meta),
            StreamKind::Audio => streams.add_audio(meta),
            StreamKind::Subtitle => streams.add_subtitle(meta),
            _ => (),
        }
    }

    streams
}

trait StreamExt {
    fn kind(&self) -> StreamKind;
    fn meta(&self) -> StreamMeta;
}

impl StreamExt for Stream<'_> {
    fn kind(&self) -> StreamKind {
        let codec = Context::from_parameters(self.parameters());
        if let Err(_) = codec {
            return StreamKind::Unknown;
        }
        let codec = codec.unwrap();
        match codec.medium() {
            media::Type::Video => StreamKind::Video,
            media::Type::Audio => StreamKind::Audio,
            media::Type::Subtitle => StreamKind::Subtitle,
            _ => StreamKind::Unknown,
        }
    }

    fn meta(&self) -> StreamMeta {
        let id = self.id();
        let index = self.index();
        StreamMeta::new(id, index)
    }
}

// fn main() {
//     ffmpeg::init().unwrap();

//     match ffmpeg::format::input(&"out.mp4".to_owned()) {
//         Ok(mut context) => {
//             let mut subtitle_stream_index = -1;
//             let mut decoder = None;

//             for stream in context.streams() {
//                 let codec = ffmpeg::codec::context::Context::from_parameters(stream.parameters())
//                     .expect("invalid codec");

//                 if codec.medium() == media::Type::Subtitle {
//                     println!("Got subtitle stream with index: {}", stream.index());
//                     let time_base = stream.time_base();
//                     println!("With time base of {}/{}", time_base.0, time_base.1);
//                     subtitle_stream_index = stream.index() as i32;
//                     decoder = codec.decoder().subtitle().ok();

//                     let meta = stream.metadata();
//                     println!("Stream metadata");
//                     for (key, value) in meta.iter() {
//                         println!("{key}: {value}");
//                     }
//                 }
//             }

//             if subtitle_stream_index < 0 {
//                 return;
//             }

//             let mut decoder = decoder.unwrap();
//             // let mut data = vec![];

//             let mut subtitle = Subtitle::new();

//             for (stream, mut packet) in context.packets() {
//                 if stream.index() == subtitle_stream_index as usize {
//                     decoder.decode(&packet, &mut subtitle);
//                     for rect in subtitle.rects() {
//                         match rect {
//                             Rect::Ass(ass_text) => println!("Got ASS: {}", ass_text.get()),
//                             Rect::Text(text) => println!("Got TEXT: {}", text.get()),
//                             Rect::Bitmap(bitmap) => println!("Got BITMAP: {}", bitmap.width()),
//                             _ => (),
//                         }
//                     }
//                     let pts = packet.pts().expect("No pts found");
//                     let duration = packet.duration();
//                     println!(
//                         "Which should be presented at {} with duration of {}",
//                         pts, duration
//                     );
//                 }
//             }

//             // println!("{:?}", subtitle.start());

//             // unsafe {
//             // let mut frame = Frame::empty();
//             // while let Ok(_) = decoder.receive_frame(&mut frame) {
//             // println!("{:?}", frame.metadata());
//             // }
//             // }

//             // let chunk = packet.data().unwrap_or(&[]);
//             // data.extend_from_slice(chunk);

//             // let subtitle = String::from_utf8(data).expect("Decoding error");
//             // fs::write("out.txt", subtitle);
//         }
//         Err(err) => (),
//     }
// }
