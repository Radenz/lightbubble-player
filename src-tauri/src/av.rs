#![allow(unused)]

use crate::prelude::*;
use std::collections::HashMap;
use std::ops::{Deref, DerefMut};
use std::{fs, path::Path};

use ffmpeg::codec::context::Context;
use ffmpeg::format::stream::Stream;
use ffmpeg::{media, subtitle::Rect, Frame, Subtitle};
use ffmpeg_next as ffmpeg;
use serde::Serialize;

// NOTE: subject to change
const USEFUL_STREAM_METADATA_KEY: [&str; 2] = ["language", "title"];

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
#[serde(untagged)]
pub enum StreamMetaValue {
    String(String),
    Number(f64),
}

impl StreamMetaValue {
    pub fn string(value: impl Into<String>) -> Self {
        Self::String(value.into())
    }

    pub fn number<T>(value: T) -> Self
    where
        T: Into<f64>,
    {
        Self::Number(value.into())
    }
}

#[derive(Serialize)]
pub struct StreamMeta(HashMap<String, StreamMetaValue>);

impl Deref for StreamMeta {
    type Target = HashMap<String, StreamMetaValue>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for StreamMeta {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl StreamMeta {
    pub fn new() -> Self {
        Self(HashMap::new())
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
        use StreamMetaValue as Value;

        let id = self.id();
        let index = self.index();
        let metadata = self.metadata();

        let mut meta = StreamMeta::new();
        meta.insert("id".to_owned(), Value::number(id));
        meta.insert("index".to_owned(), Value::number(index as f64));

        for (key, value) in metadata.iter() {
            if USEFUL_STREAM_METADATA_KEY.contains(&key) {
                meta.insert(key.to_owned(), Value::string(value));
            }
        }

        meta
    }
}
