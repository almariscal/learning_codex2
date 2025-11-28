#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    env,
    fs,
    net::TcpListener,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::Duration,
};

use anyhow::{anyhow, Context, Result};
use dirs::home_dir;
use once_cell::sync::Lazy;
use serde::Serialize;
use serde_json::to_string;
use shell_words::split;
use tauri::{
    api::dialog::blocking::FileDialogBuilder, AppHandle, Manager, State, WindowEvent,
};

#[derive(Clone, Serialize)]
struct DesktopContext {
    api_base: String,
    data_dir: String,
}

struct AppState {
    runtime: Mutex<DesktopContext>,
    child: Mutex<Option<Child>>,
}

impl AppState {
    fn runtime(&self) -> DesktopContext {
        self.runtime.lock().expect("runtime poisoned").clone()
    }

    fn replace(&self, ctx: DesktopContext, child: Child) {
        let mut runtime = self.runtime.lock().expect("runtime poisoned");
        let mut child_guard = self.child.lock().expect("child poisoned");

        if let Some(mut existing) = child_guard.take() {
            let _ = existing.kill();
        }

        *runtime = ctx;
        *child_guard = Some(child);
    }

    fn shutdown(&self) {
        if let Some(mut child) = self.child.lock().expect("child poisoned").take() {
            let _ = child.kill();
        }
    }
}

#[tauri::command]
fn desktop_context(state: State<AppState>) -> DesktopContext {
    state.runtime()
}

#[tauri::command]
fn select_data_directory(app: AppHandle, state: State<AppState>) -> Result<DesktopContext, String> {
    pick_and_restart(app, state).map_err(|err| err.to_string())
}

static CONFIG_NAMESPACE: &str = "parking-allocator";
static CONFIG_FILE: Lazy<PathBuf> = Lazy::new(|| {
    let base = home_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join(format!(".{CONFIG_NAMESPACE}"))
        .join("desktop")
        .join("config.json")
});

fn config_dir() -> PathBuf {
    CONFIG_FILE
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn default_data_dir() -> PathBuf {
    home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(format!(".{CONFIG_NAMESPACE}"))
        .join("data")
}

fn load_configured_data_dir() -> Option<PathBuf> {
    if let Ok(text) = fs::read_to_string(CONFIG_FILE.as_path()) {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) {
            if let Some(dir) = value.get("data_dir").and_then(|v| v.as_str()) {
                return Some(PathBuf::from(dir));
            }
        }
    }
    None
}

fn persist_data_dir(path: &Path) -> Result<()> {
    fs::create_dir_all(config_dir()).context("creating config dir")?;
    let payload = serde_json::json!({ "data_dir": path.to_string_lossy() });
    fs::write(
        CONFIG_FILE.as_path(),
        serde_json::to_string_pretty(&payload)?,
    )
    .context("writing config file")?;
    Ok(())
}

fn ensure_dir_exists(path: &Path) -> Result<PathBuf> {
    fs::create_dir_all(path).with_context(|| format!("creating {path:?}"))?;
    Ok(path.to_path_buf())
}

fn resolve_initial_data_dir() -> Result<PathBuf> {
    if let Ok(env_path) = env::var("PARKING_DATA_DIR") {
        return ensure_dir_exists(Path::new(&env_path));
    }

    if let Some(saved) = load_configured_data_dir() {
        return ensure_dir_exists(&saved);
    }

    if let Some(selected) = FileDialogBuilder::new()
        .set_title("Selecciona la carpeta donde guardaremos los datos")
        .pick_folder()
    {
        persist_data_dir(&selected)?;
        return ensure_dir_exists(&selected);
    }

    let fallback = ensure_dir_exists(&default_data_dir())?;
    persist_data_dir(&fallback)?;
    Ok(fallback)
}

fn pick_and_restart(app: AppHandle, state: State<AppState>) -> Result<DesktopContext> {
    if let Some(selected) = FileDialogBuilder::new()
        .set_title("Selecciona la carpeta donde guardaremos los datos")
        .pick_folder()
    {
        persist_data_dir(&selected)?;
        ensure_dir_exists(&selected)?;
        return restart_backend(app, state, selected.to_path_buf());
    }

    Err(anyhow!("No se seleccionó ninguna carpeta"))
}

fn restart_backend(app: AppHandle, state: State<AppState>, data_dir: PathBuf) -> Result<DesktopContext> {
    let (child, ctx) = launch_backend(&app, &data_dir)?;
    state.replace(ctx.clone(), child);
    broadcast_context(&app, &ctx);
    Ok(ctx)
}

fn launch_backend(app: &AppHandle, data_dir: &Path) -> Result<(Child, DesktopContext)> {
    let port = reserve_port()?;
    let mut command = build_backend_command(app)?;
    command
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(port.to_string())
        .arg("--data-dir")
        .arg(data_dir)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    let data_dir_str = data_dir.to_string_lossy().to_string();
    command.env("PARKING_DATA_DIR", &data_dir_str);
    command.env("DATA_DIR", &data_dir_str);

    let child = command.spawn().context("starting backend process")?;

    let api_base = format!("http://127.0.0.1:{port}/api");
    wait_for_backend(&api_base)?;

    let ctx = DesktopContext {
        api_base,
        data_dir: data_dir_str,
    };

    Ok((child, ctx))
}

fn reserve_port() -> Result<u16> {
    let listener = TcpListener::bind("127.0.0.1:0").context("reserving TCP port")?;
    let port = listener.local_addr().map(|addr| addr.port())?;
    drop(listener);
    Ok(port)
}

fn wait_for_backend(api_base: &str) -> Result<()> {
    let health_url = format!("{api_base}/health");
    for _ in 0..60 {
        if let Ok(response) = ureq::get(&health_url).timeout(Duration::from_millis(500)).call() {
            if response.status() < 500 {
                return Ok(());
            }
        }
        thread::sleep(Duration::from_millis(500));
    }

    Err(anyhow!("El backend no respondió a tiempo"))
}

struct BackendCommand {
    program: PathBuf,
    args: Vec<String>,
    working_dir: Option<PathBuf>,
}

fn build_backend_command(app: &AppHandle) -> Result<Command> {
    let backend = locate_packaged_backend(app)
        .or_else(|| dev_backend_command().ok())
        .ok_or_else(|| anyhow!("No se encontró ningún comando para el backend"))?;
    let mut command = Command::new(backend.program);
    command.args(backend.args);
    if let Some(dir) = backend.working_dir {
        command.current_dir(dir);
    }
    Ok(command)
}

fn locate_packaged_backend(app: &AppHandle) -> Option<BackendCommand> {
    let candidates = if cfg!(target_os = "windows") {
        vec!["backend/parking-backend.exe", "backend/parking-backend"]
    } else {
        vec!["backend/parking-backend", "backend/parking-backend.exe"]
    };

    for candidate in candidates {
        if let Some(path) = app.path_resolver().resolve_resource(candidate) {
            if path.exists() {
                return Some(BackendCommand {
                    program: path,
                    args: vec!["--print-endpoint".into()],
                    working_dir: None,
                });
            }
        }
    }

    None
}

fn dev_backend_command() -> Result<BackendCommand> {
    if let Ok(cmd) = env::var("PARKING_BACKEND_DEV_COMMAND") {
        let parts = split(&cmd).map_err(|err| anyhow!("Cannot parse PARKING_BACKEND_DEV_COMMAND: {err}"))?;
        return build_command_from_parts(parts);
    }

    let mut default = vec!["python3".into(), "-m".into(), "app.desktop.server".into()];
    if cfg!(target_os = "windows") {
        default[0] = "python".into();
    }

    build_command_from_parts(default)
}

fn build_command_from_parts(parts: Vec<String>) -> Result<BackendCommand> {
    let (first, rest) = parts
        .split_first()
        .ok_or_else(|| anyhow!("Backend command must include executable"))?;
    let mut working_dir = None;
    if let Ok(root) = workspace_root() {
        working_dir = Some(root);
    }

    Ok(BackendCommand {
        program: PathBuf::from(first),
        args: rest.to_vec(),
        working_dir,
    })
}

fn workspace_root() -> Result<PathBuf> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .map(Path::to_path_buf)
        .ok_or_else(|| anyhow!("Cannot determine workspace root"))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_context, select_data_directory])
        .setup(|app| {
            let app_handle = app.handle();
            let data_dir = resolve_initial_data_dir()?;
            let (child, ctx) = launch_backend(&app_handle, &data_dir)?;
            app.manage(AppState {
                runtime: Mutex::new(ctx.clone()),
                child: Mutex::new(Some(child)),
            });

            broadcast_context(&app_handle, &ctx);
            Ok(())
        })
        .on_window_event(|event| {
            if matches!(event.event(), WindowEvent::CloseRequested { .. }) {
                let state = event.window().state::<AppState>();
                state.shutdown();
            }
        })
        .run(tauri::generate_context!())
        .expect("error running Parking Allocator desktop");
}

fn broadcast_context(app: &AppHandle, ctx: &DesktopContext) {
    if let Some(window) = app.get_window("main") {
        if let Ok(serialized) = to_string(&ctx.api_base) {
            let script = format!("window.__API_BASE__ = {serialized};");
            let _ = window.eval(&script);
        }
        window.emit("desktop://ready", ctx).ok();
    }
}
