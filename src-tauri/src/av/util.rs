use crate::prelude::*;
use ffmpeg::Rational;

pub fn timestamp_to_seconds(timestamp: i64, time_base: Rational) -> f64 {
    let numerator = time_base.0 as i64;
    let denominator = time_base.1 as i64;
    if timestamp % denominator == 0 {
        (timestamp / denominator) as f64 * numerator as f64
    } else {
        let time_base: f64 = time_base.into();
        timestamp as f64 * time_base
    }
}
