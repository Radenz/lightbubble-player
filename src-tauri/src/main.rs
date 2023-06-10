// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use args::get_args;
use std::env;
use tauri::generate_handler;

mod args;

fn main() {
    tauri::Builder::default()
        .invoke_handler(generate_handler![get_args])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
