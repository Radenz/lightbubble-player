use ffmpeg::Stream;

use crate::prelude::*;
use ffmpeg::codec;

fn get_codec(stream: Stream) -> Option<codec::Context> {
    codec::context::Context::from_parameters(stream.parameters()).ok()
}

pub fn get_subtitle_decoder(stream: Stream) -> Option<codec::decoder::Subtitle> {
    let codec = get_codec(stream);
    let Some(codec) = codec else {
      return None;
    };
    codec.decoder().subtitle().ok()
}
