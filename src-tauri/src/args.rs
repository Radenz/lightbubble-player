use std::env;

#[tauri::command]
pub fn get_args() -> Vec<String> {
    env::args().collect::<Vec<String>>()
}
