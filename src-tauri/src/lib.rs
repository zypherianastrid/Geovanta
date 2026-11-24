use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub family: String,
    pub app_version: String,
}

#[tauri::command]
fn set_window_title(window: tauri::Window, title: String) -> Result<(), String> {
    window.set_title(&title).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        family: std::env::consts::FAMILY.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
fn save_vector_file(file_path: String, content: Vec<u8>) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(file_path)
}

#[tauri::command]
fn read_vector_file(file_path: String) -> Result<Vec<u8>, String> {
    fs::read(&file_path).map_err(|e| e.to_string())
}

#[cfg(target_os = "windows")]
mod win_accent {
    use std::ffi::c_void;

    const HKEY_CURRENT_USER: isize = 0x80000001u32 as isize;
    const RRF_RT_REG_DWORD: u32 = 0x00000010;

    #[link(name = "advapi32")]
    extern "system" {
        fn RegGetValueW(
            hkey: isize,
            lp_sub_key: *const u16,
            lp_value: *const u16,
            dw_flags: u32,
            pdw_type: *mut u32,
            pv_data: *mut c_void,
            pcb_data: *mut u32,
        ) -> i32;
    }

    fn to_wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn read_hkcu_dword(subkey_path: &str, name: &str) -> Option<u32> {
        let subkey = to_wide(subkey_path);
        let val_name = to_wide(name);
        let mut data: u32 = 0;
        let mut size: u32 = std::mem::size_of::<u32>() as u32;
        let status = unsafe {
            RegGetValueW(
                HKEY_CURRENT_USER,
                subkey.as_ptr(),
                val_name.as_ptr(),
                RRF_RT_REG_DWORD,
                std::ptr::null_mut(),
                (&mut data as *mut u32).cast::<c_void>(),
                &mut size,
            )
        };
        if status == 0 {
            Some(data)
        } else {
            None
        }
    }

    pub fn read_windows_accent_hex() -> Result<String, String> {
        // Windows DWM AccentColor is stored as 0xAABBGGRR (ABGR little-endian).
        if let Some(abgr) = read_hkcu_dword("Software\\Microsoft\\Windows\\DWM", "AccentColor") {
            let r = abgr & 0xff;
            let g = (abgr >> 8) & 0xff;
            let b = (abgr >> 16) & 0xff;
            return Ok(format!("#{:02x}{:02x}{:02x}", r, g, b));
        }
        // Explorer AccentColorMenu is also stored as 0xAABBGGRR (ABGR little-endian).
        if let Some(abgr) = read_hkcu_dword("Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Accent", "AccentColorMenu") {
            let r = abgr & 0xff;
            let g = (abgr >> 8) & 0xff;
            let b = (abgr >> 16) & 0xff;
            return Ok(format!("#{:02x}{:02x}{:02x}", r, g, b));
        }
        // ColorizationColor is stored as 0xAARRGGBB (ARGB).
        if let Some(argb) = read_hkcu_dword("Software\\Microsoft\\Windows\\DWM", "ColorizationColor") {
            let r = (argb >> 16) & 0xff;
            let g = (argb >> 8) & 0xff;
            let b = argb & 0xff;
            return Ok(format!("#{:02x}{:02x}{:02x}", r, g, b));
        }
        Err("Unable to read Windows DWM accent color from registry".to_string())
    }
}

#[tauri::command]
fn get_windows_accent_color() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        return win_accent::read_windows_accent_hex();
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("Windows system accent color is only available on Windows".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.set_title("Geovanta — Vector Editor (Windows 64-Bit)");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_window_title,
            get_system_info,
            save_vector_file,
            read_vector_file,
            get_windows_accent_color
        ])
        .run(tauri::generate_context!())
        .expect("error while running Geovanta Tauri Windows 64-bit application");
}
