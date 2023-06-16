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
    let maybe_input = ffmpeg::format::input(&path);
    let Ok(input) = maybe_input else {
        return Streams::new();
    };

    let mut streams = Streams::new();

    for stream in input.streams() {
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
        let maybe_codec = Context::from_parameters(self.parameters());
        let Ok(codec) = maybe_codec else {
            return StreamKind::Unknown;
        };
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
