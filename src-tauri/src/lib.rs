/// Tauri command: returns CLI arguments (file path and/or URL) passed at launch.
#[tauri::command]
fn get_cli_args() -> (Option<String>, Option<String>) {
    let args: Vec<String> = std::env::args().collect();
    let mut file_path: Option<String> = None;
    let mut url: Option<String> = None;

    let mut i = 1; // skip executable name
    while i < args.len() {
        match args[i].as_str() {
            "--url" => {
                if i + 1 < args.len() {
                    url = Some(args[i + 1].clone());
                    i += 2;
                } else {
                    i += 1;
                }
            }
            arg if !arg.starts_with('-') && file_path.is_none() => {
                file_path = Some(arg.to_string());
                i += 1;
            }
            _ => {
                i += 1;
            }
        }
    }

    (file_path, url)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![get_cli_args])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
