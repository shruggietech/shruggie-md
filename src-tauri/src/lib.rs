use tauri_plugin_fs::FsExt;

/// Parse CLI arguments into (file_path, url). Shared by the command and setup.
fn parse_cli_args() -> (Option<String>, Option<String>) {
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

/// Tauri command: returns CLI arguments (file path, URL, and pre-read file content).
/// The third element is the file content read via std::fs (bypasses FS plugin scope).
#[tauri::command]
fn get_cli_args() -> (Option<String>, Option<String>, Option<String>) {
    let (file_path, url) = parse_cli_args();

    let file_content = file_path.as_ref().and_then(|p| {
        std::fs::read_to_string(p).ok()
    });

    (file_path, url, file_content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![get_cli_args])
        .setup(|app| {
            // Dynamically allow CLI file path in the FS plugin scope so that
            // subsequent frontend readTextFile / watchImmediate calls succeed.
            let (file_path, _url) = parse_cli_args();
            if let Some(ref path) = file_path {
                let p = std::path::Path::new(path);
                if p.exists() {
                    let _ = app.fs_scope().allow_file(p);
                    // Also allow the parent directory so file watcher can work
                    if let Some(parent) = p.parent() {
                        let _ = app.fs_scope().allow_directory(parent, false);
                    }
                }
            }

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
