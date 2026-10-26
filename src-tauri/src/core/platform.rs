//! Small OS boundary shared by discovery, background processes and system actions.
use std::{ffi::OsStr, path::{Path, PathBuf}, process::Command};

pub fn home_dir() -> Option<PathBuf> {
    #[cfg(windows)]
    { std::env::var_os("USERPROFILE").filter(|s| !s.is_empty()).map(PathBuf::from) }
    #[cfg(not(windows))]
    { std::env::var_os("HOME").filter(|s| !s.is_empty()).map(PathBuf::from) }
}

/// Suppresses only the subprocess console, never an explicit browser GUI.
pub fn command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; command.creation_flags(0x08000000); }
    #[cfg(not(windows))]
    let _ = &mut command;
    command
}

pub fn open_path(path: &Path) -> std::io::Result<()> {
    #[cfg(windows)]
    { return open_shell(path); }
    #[cfg(not(windows))]
    {
    #[cfg(target_os="macos")] let program = "open";
    #[cfg(not(any(target_os="macos",windows)))] let program = "xdg-open";
    let status = command(program).arg(path).status()?;
    if status.success() { Ok(()) } else { Err(std::io::Error::other("system open failed")) }
    }
}

#[cfg(windows)]
pub fn recycle(path: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::{SHFileOperationW, SHFILEOPSTRUCTW, FO_DELETE, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_NOERRORUI, FOF_SILENT, FOF_WANTNUKEWARNING};
    // Shell file operations require a double-NUL multistring and normal Win32 spelling.
    // Fail rather than permanently delete on unsupported paths or volumes.
    let path = path.canonicalize()?;
    let text = path.to_string_lossy();
    let text = if let Some(rest) = text.strip_prefix(r"\\?\UNC\") { format!(r"\\{}", rest) }
        else { text.strip_prefix(r"\\?\").unwrap_or(&text).to_string() };
    if text.starts_with(r"\\") { return Err(std::io::Error::other("network volume cannot guarantee recycling")); }
    if text.encode_utf16().count() >= 260 { return Err(std::io::Error::other("recycle path exceeds Shell limit")); }
    let wide: Vec<u16> = OsStr::new(&text).encode_wide().chain([0,0]).collect();
    let mut operation = SHFILEOPSTRUCTW { wFunc: FO_DELETE, pFrom: wide.as_ptr(),
        fFlags: (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_NOERRORUI | FOF_SILENT | FOF_WANTNUKEWARNING) as u16,
        ..Default::default() };
    let code = unsafe { SHFileOperationW(&mut operation) };
    if code != 0 || operation.fAnyOperationsAborted != 0 { return Err(std::io::Error::other(format!("recycle cancelled or failed ({code})"))); }
    Ok(())
}

#[cfg(windows)]
pub fn open_shell(target: impl AsRef<OsStr>) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    let wide: Vec<u16> = target.as_ref().encode_wide().chain(Some(0)).collect();
    let result = unsafe { ShellExecuteW(std::ptr::null_mut(), std::ptr::null(), wide.as_ptr(), std::ptr::null(), std::ptr::null(), 1) };
    if (result as isize) <= 32 { Err(std::io::Error::other("ShellExecute failed")) } else { Ok(()) }
}
