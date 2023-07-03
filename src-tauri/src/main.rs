// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use args::get_args;
use av::{discover_streams, subtitle::get_embedded_subtitle};
use prelude::*;
use std::env;
use tauri::generate_handler;

mod args;
mod av;
mod prelude;

fn main() {
    ffmpeg::init().unwrap();
    tauri::Builder::default()
        .invoke_handler(generate_handler![
            get_args,
            discover_streams,
            get_embedded_subtitle
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
