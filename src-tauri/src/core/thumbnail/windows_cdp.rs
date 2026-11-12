use std::{
    ffi::OsStr,
    fs::File,
    io::{self, Read, Write},
    mem::size_of,
    os::windows::{
        ffi::OsStrExt,
        io::{AsRawHandle, FromRawHandle, OwnedHandle},
    },
    path::Path,
    ptr::{null, null_mut},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, SyncSender},
    },
    time::{Duration, Instant},
};
use windows_sys::Win32::{
    Foundation::{SetHandleInformation, HANDLE_FLAG_INHERIT},
    Security::SECURITY_ATTRIBUTES,
    System::{
        Pipes::{CreatePipe, PeekNamedPipe},
        Threading::{
            CreateProcessW, DeleteProcThreadAttributeList, InitializeProcThreadAttributeList,
            TerminateProcess, UpdateProcThreadAttribute, WaitForSingleObject, CREATE_NO_WINDOW,
            EXTENDED_STARTUPINFO_PRESENT, PROCESS_INFORMATION, PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
            STARTUPINFOEXW,
        },
    },
};

pub(super) struct Process(OwnedHandle);

impl Process {
    pub fn close(&mut self) {
        unsafe {
            TerminateProcess(self.0.as_raw_handle(), 1);
            WaitForSingleObject(self.0.as_raw_handle(), 5000);
        }
    }
}

pub(super) struct PipeReader(File);

impl Read for PipeReader {
    fn read(&mut self, bytes: &mut [u8]) -> io::Result<usize> {
        let mut available = 0;
        if unsafe {
            PeekNamedPipe(
                self.0.as_raw_handle(),
                null_mut(),
                0,
                null_mut(),
                &mut available,
                null_mut(),
            )
        } == 0
        {
            return Err(io::Error::last_os_error());
        }
        if available == 0 {
            return Err(io::ErrorKind::WouldBlock.into());
        }
        let count = bytes.len().min(available as usize);
        self.0.read(&mut bytes[..count])
    }
}

type Packet = (Vec<u8>, SyncSender<io::Result<()>>);
pub(super) struct PipeWriter(SyncSender<Packet>);

impl PipeWriter {
    pub fn send(&self, mut bytes: Vec<u8>, cancelled: Option<&AtomicBool>) -> Result<(), String> {
        bytes.push(0);
        let (done, result) = mpsc::sync_channel(1);
        self.0
            .try_send((bytes, done))
            .map_err(|error| error.to_string())?;
        let deadline = Instant::now() + Duration::from_secs(15);
        while Instant::now() < deadline
            && !cancelled.is_some_and(|flag| flag.load(Ordering::Acquire))
        {
            match result.recv_timeout(Duration::from_millis(10)) {
                Ok(status) => return status.map_err(|error| error.to_string()),
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    return Err("Chromium CDP write pipe closed".into())
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
            }
        }
        Err("CDP write cancelled or timed out".into())
    }
}

fn pipe() -> io::Result<(OwnedHandle, OwnedHandle)> {
    let mut read = null_mut();
    let mut write = null_mut();
    let attrs = SECURITY_ATTRIBUTES {
        nLength: size_of::<SECURITY_ATTRIBUTES>() as u32,
        lpSecurityDescriptor: null_mut(),
        bInheritHandle: 1,
    };
    if unsafe { CreatePipe(&mut read, &mut write, &attrs, 0) } == 0 {
        return Err(io::Error::last_os_error());
    }
    Ok(unsafe {
        (
            OwnedHandle::from_raw_handle(read),
            OwnedHandle::from_raw_handle(write),
        )
    })
}

fn wide(value: &OsStr) -> Vec<u16> {
    value.encode_wide().chain(Some(0)).collect()
}

pub(super) fn launch(
    chrome: &Path,
    profile: &Path,
) -> io::Result<(Process, PipeWriter, PipeReader)> {
    let (browser_read, host_write) = pipe()?;
    let (host_read, browser_write) = pipe()?;
    for handle in [&host_read, &host_write] {
        if unsafe { SetHandleInformation(handle.as_raw_handle(), HANDLE_FLAG_INHERIT, 0) } == 0 {
            return Err(io::Error::last_os_error());
        }
    }
    let mut bytes = 0;
    unsafe {
        InitializeProcThreadAttributeList(null_mut(), 1, 0, &mut bytes);
    }
    if bytes == 0 {
        return Err(io::Error::last_os_error());
    }
    let mut allocation = vec![0usize; bytes.div_ceil(size_of::<usize>())];
    let attrs = allocation.as_mut_ptr().cast();
    if unsafe { InitializeProcThreadAttributeList(attrs, 1, 0, &mut bytes) } == 0 {
        return Err(io::Error::last_os_error());
    }
    struct AttributeList(windows_sys::Win32::System::Threading::LPPROC_THREAD_ATTRIBUTE_LIST);
    impl Drop for AttributeList {
        fn drop(&mut self) {
            unsafe { DeleteProcThreadAttributeList(self.0) };
        }
    }
    let _list = AttributeList(attrs);
    let handles = [browser_read.as_raw_handle(), browser_write.as_raw_handle()];
    if unsafe {
        UpdateProcThreadAttribute(
            attrs,
            0,
            PROC_THREAD_ATTRIBUTE_HANDLE_LIST as usize,
            handles.as_ptr().cast(),
            size_of::<[std::os::windows::io::RawHandle; 2]>(),
            null_mut(),
            null(),
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }

    let mut args = std::ffi::OsString::from("\"");
    args.push(chrome);
    args.push(format!("\" --headless=new --remote-debugging-pipe --remote-debugging-io-pipes={},{} --no-first-run --no-default-browser-check --disable-background-networking --disable-component-update --disable-extensions --disable-sync --disable-gpu --hide-scrollbars --mute-audio --run-all-compositor-stages-before-draw --user-data-dir=\"",
        handles[0] as usize, handles[1] as usize));
    args.push(profile);
    args.push("\"");
    let mut command_line = wide(&args);
    let executable = wide(chrome.as_os_str());
    let mut startup = STARTUPINFOEXW::default();
    startup.StartupInfo.cb = size_of::<STARTUPINFOEXW>() as u32;
    startup.lpAttributeList = attrs;
    let mut process = PROCESS_INFORMATION::default();
    if unsafe {
        CreateProcessW(
            executable.as_ptr(),
            command_line.as_mut_ptr(),
            null(),
            null(),
            1,
            CREATE_NO_WINDOW | EXTENDED_STARTUPINFO_PRESENT,
            null(),
            null(),
            &startup.StartupInfo,
            &mut process,
        )
    } == 0
    {
        return Err(io::Error::last_os_error());
    }
    let mut child = Process(unsafe { OwnedHandle::from_raw_handle(process.hProcess) });
    drop(unsafe { OwnedHandle::from_raw_handle(process.hThread) });
    drop(browser_read);
    drop(browser_write);
    let mut writer = File::from(host_write);
    let (sender, receiver) = mpsc::sync_channel::<Packet>(1);
    if let Err(error) = std::thread::Builder::new()
        .name("nutbook-chromium-cdp".into())
        .spawn(move || {
            for (packet, response) in receiver {
                let result = writer.write_all(&packet);
                let failed = result.is_err();
                let _ = response.send(result);
                if failed {
                    break;
                }
            }
        })
    {
        child.close();
        return Err(error);
    }
    Ok((child, PipeWriter(sender), PipeReader(File::from(host_read))))
}
