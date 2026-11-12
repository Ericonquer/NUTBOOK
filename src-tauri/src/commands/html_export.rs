use crate::{errors::AppError, state::AppState};

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(tag = "format", rename_all = "lowercase")]
pub enum HtmlExportOptions {
    Pdf {
        #[serde(rename = "allowCopy")]
        allow_copy: bool,
        #[serde(rename = "allowEdit")]
        allow_edit: bool,
    },
    Png {
        scale: u64,
        parts: usize,
    },
    Pptx {
        viewport: Option<[u64; 2]>,
    },
}

#[derive(serde::Serialize)]
pub struct SlidePreview {
    page: usize,
    image: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlExportPreview {
    pages: usize,
    width: u64,
    height: u64,
    preview: SlidePreview,
    png_parts: [usize; 2],
}

#[tauri::command]
pub async fn inspect_html_export(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    item_id: i64,
    expected_file_hash: String,
    page: usize,
) -> Result<HtmlExportPreview, AppError> {
    #[cfg(any(target_os = "macos", windows))]
    return desktop::inspect(webview, state, item_id, expected_file_hash, page).await;
    #[cfg(not(any(target_os = "macos", windows)))]
    {
        let _ = (webview, state, item_id, expected_file_hash, page);
        Err(AppError::ExportEngineUnavailable)
    }
}

#[cfg(any(target_os = "macos", windows))]
mod desktop {
    use super::*;
    use crate::{
        core::{
            html_edit::content_hash_bytes,
            thumbnail::{find_system_chromium_executable, html_pdf},
        },
        db::repositories::ItemRepository,
    };
    #[cfg(target_os = "macos")]
    use objc2_app_kit::NSOpenSavePanelDelegate;
    #[cfg(target_os = "macos")]
    use objc2_foundation::NSObjectProtocol;
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::{
            atomic::{AtomicBool, Ordering},
            Arc, Mutex,
        },
    };
    use tauri::Emitter;

    struct Job {
        id: String,
        cancelled: Arc<AtomicBool>,
    }

    static JOB: Mutex<Option<Job>> = Mutex::new(None);

    struct Reservation(Arc<AtomicBool>);

    impl Drop for Reservation {
        fn drop(&mut self) {
            if let Ok(mut slot) = JOB.lock() {
                *slot = None;
            }
        }
    }

    fn reserve(id: String) -> Result<Reservation, AppError> {
        uuid::Uuid::parse_str(&id).map_err(|_| AppError::InvalidParams)?;
        let mut slot = JOB.lock().map_err(|_| AppError::InternalError)?;
        if slot.is_some() {
            return Err(AppError::HtmlExportFailed(
                "Another HTML export is running".into(),
            ));
        }
        let cancelled = Arc::new(AtomicBool::new(false));
        *slot = Some(Job {
            id,
            cancelled: Arc::clone(&cancelled),
        });
        Ok(Reservation(cancelled))
    }

    pub fn cancel(job_id: &str) {
        if let Ok(slot) = JOB.lock() {
            if let Some(job) = slot.as_ref().filter(|job| job.id == job_id) {
                job.cancelled.store(true, Ordering::Release);
            }
        }
    }

    fn verify_source(source: &Path, expected_hash: &str) -> Result<(), AppError> {
        let bytes = fs::read(source).map_err(|_| AppError::IoError)?;
        if content_hash_bytes(&bytes) != expected_hash {
            return Err(AppError::EditConflict);
        }
        Ok(())
    }

    #[derive(Debug, PartialEq, Eq)]
    struct FileRevision {
        device: u64,
        inode: u64,
        size: u64,
        changed: (i64, i64),
        modified: (i64, i64),
    }

    #[cfg(target_os = "macos")]
    fn target_revision(path: &Path) -> Result<Option<FileRevision>, AppError> {
        use std::os::unix::fs::MetadataExt;

        match fs::symlink_metadata(path) {
            Ok(metadata) if metadata.is_file() => Ok(Some(FileRevision {
                device: metadata.dev(),
                inode: metadata.ino(),
                size: metadata.len(),
                changed: (metadata.ctime(), metadata.ctime_nsec()),
                modified: (metadata.mtime(), metadata.mtime_nsec()),
            })),
            Ok(_) => Err(AppError::InvalidParams),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(_) => Err(AppError::IoError),
        }
    }

    #[cfg(windows)]
    fn target_revision(path: &Path) -> Result<Option<FileRevision>, AppError> {
        use std::os::windows::{fs::MetadataExt, io::AsRawHandle};
        use windows_sys::Win32::Storage::FileSystem::{
            GetFileInformationByHandle, BY_HANDLE_FILE_INFORMATION,
        };

        let metadata = match fs::symlink_metadata(path) {
            Ok(metadata) if metadata.is_file() => metadata,
            Ok(_) => return Err(AppError::InvalidParams),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(_) => return Err(AppError::IoError),
        };
        let file = fs::File::open(path).map_err(|_| AppError::IoError)?;
        let mut info = BY_HANDLE_FILE_INFORMATION::default();
        if unsafe { GetFileInformationByHandle(file.as_raw_handle(), &mut info) } == 0 {
            return Err(AppError::IoError);
        }
        Ok(Some(FileRevision {
            device: u64::from(info.dwVolumeSerialNumber),
            inode: (u64::from(info.nFileIndexHigh) << 32) | u64::from(info.nFileIndexLow),
            size: metadata.len(),
            changed: (metadata.creation_time() as i64, 0),
            modified: (metadata.last_write_time() as i64, 0),
        }))
    }

    struct SaveDestination {
        path: PathBuf,
        replacement: Option<FileRevision>,
    }

    #[cfg(target_os = "macos")]
    objc2::define_class!(
        #[unsafe(super(objc2_foundation::NSObject))]
        #[thread_kind = objc2::MainThreadOnly]
        #[ivars = std::cell::RefCell<Option<Result<SaveDestination, AppError>>>]
        struct HtmlExportSaveDelegate;

        unsafe impl NSObjectProtocol for HtmlExportSaveDelegate {}

        unsafe impl NSOpenSavePanelDelegate for HtmlExportSaveDelegate {}

        impl HtmlExportSaveDelegate {
            #[unsafe(method(panel:validateURL:error:))]
            fn panel_validate_url_error(
                &self,
                _panel: &objc2::runtime::AnyObject,
                url: &objc2_foundation::NSURL,
                _error: *mut *mut objc2_foundation::NSError,
            ) -> bool {
                use objc2::DefinedClass;
                // AppKit validates the final URL after its overwrite decision.
                // Bind the confirmation to that specific file revision.
                let selection = url.to_file_path().ok_or(AppError::InvalidParams).and_then(|path| {
                    let name = path.file_name().ok_or(AppError::InvalidParams)?;
                    let parent = path.parent().ok_or(AppError::InvalidParams)?
                        .canonicalize().map_err(|_| AppError::IoError)?;
                    let path = parent.join(name);
                    let replacement = target_revision(&path)?;
                    Ok(SaveDestination { path, replacement })
                });
                self.ivars().replace(Some(selection));
                true
            }
        }
    );

    #[cfg(target_os = "macos")]
    async fn select_destination(
        webview: &tauri::Webview,
        file_name: String,
        english: bool,
        options: HtmlExportOptions,
    ) -> Result<SaveDestination, AppError> {
        use objc2::runtime::ProtocolObject;
        use objc2::{DefinedClass, MainThreadMarker, MainThreadOnly};
        use objc2_app_kit::{
            NSModalResponse, NSModalResponseCancel, NSModalResponseOK, NSSavePanel, NSWindow,
        };
        use objc2_foundation::{NSArray, NSString};
        use objc2_uniform_type_identifiers::UTType;

        let (sender, mut receiver) = tauri::async_runtime::channel(1);
        let window = webview.window();
        webview
            .run_on_main_thread(move || {
                let (Some(mtm), Ok(parent)) = (MainThreadMarker::new(), window.ns_window()) else {
                    let _ = sender.try_send(Err(AppError::InternalError));
                    return;
                };
                let delegate = HtmlExportSaveDelegate::alloc(mtm).set_ivars(Default::default());
                let delegate: objc2::rc::Retained<HtmlExportSaveDelegate> =
                    unsafe { objc2::msg_send![super(delegate), init] };
                let panel = NSSavePanel::savePanel(mtm);
                let (extension, type_id, label) = match options {
                    HtmlExportOptions::Pdf { .. } => ("pdf", "com.adobe.pdf", "PDF"),
                    HtmlExportOptions::Png { .. } => ("png", "public.png", "PNG"),
                    HtmlExportOptions::Pptx { .. } => (
                        "pptx",
                        "org.openxmlformats.presentationml.presentation",
                        "PPTX",
                    ),
                };
                let title = match (options, english) {
                    (HtmlExportOptions::Png { parts: 2.., .. }, true) => {
                        "Save PNG parts in a new folder named after the file".into()
                    }
                    (HtmlExportOptions::Png { parts: 2.., .. }, false) => {
                        "分段 PNG 将保存到以文件名命名的新文件夹".into()
                    }
                    (_, true) => format!("Export {label}"),
                    (_, false) => format!("导出 {label}"),
                };
                let title = NSString::from_str(&title);
                let prompt = NSString::from_str(if english { "Save" } else { "保存" });
                let name_label =
                    NSString::from_str(if english { "Save As:" } else { "存储为：" });
                panel.setMessage(Some(&title));
                panel.setPrompt(Some(&prompt));
                panel.setNameFieldLabel(Some(&name_label));
                panel.setNameFieldStringValue(&NSString::from_str(&file_name));
                let Some(file_type) = UTType::typeWithIdentifier(&NSString::from_str(type_id))
                else {
                    let _ = sender.try_send(Err(AppError::InternalError));
                    return;
                };
                panel.setAllowedContentTypes(&NSArray::from_slice(&[&*file_type]));
                panel.setShowsTagField(false);
                panel.setCanCreateDirectories(true);
                unsafe { panel.setDelegate(Some(ProtocolObject::from_ref(&*delegate))) };
                let active_panel = panel.clone();
                let complete = block2::RcBlock::new(move |response: NSModalResponse| {
                    let result = match response {
                        value if value == NSModalResponseOK => delegate
                            .ivars()
                            .take()
                            .unwrap_or(Err(AppError::InvalidParams))
                            .and_then(|selection| {
                                if !selection
                                    .path
                                    .extension()
                                    .is_some_and(|ext| ext.eq_ignore_ascii_case(extension))
                                {
                                    return Err(AppError::InvalidParams);
                                }
                                Ok(selection)
                            }),
                        value if value == NSModalResponseCancel => Err(AppError::ExportCancelled),
                        _ => Err(AppError::InternalError),
                    };
                    unsafe { active_panel.setDelegate(None) };
                    let _ = sender.try_send(result);
                });
                // Tauri owns the parent NSWindow, and this closure runs on AppKit's main thread.
                let parent = unsafe { &*parent.cast::<NSWindow>() };
                panel.beginSheetModalForWindow_completionHandler(parent, &complete);
            })
            .map_err(|_| AppError::InternalError)?;
        receiver.recv().await.ok_or(AppError::InternalError)?
    }

    #[cfg(windows)]
    async fn select_destination(
        webview: &tauri::Webview,
        file_name: String,
        english: bool,
        options: HtmlExportOptions,
    ) -> Result<SaveDestination, AppError> {
        let (extension, label) = match options {
            HtmlExportOptions::Pdf { .. } => ("pdf", "PDF"),
            HtmlExportOptions::Png { .. } => ("png", "PNG"),
            HtmlExportOptions::Pptx { .. } => ("pptx", "PPTX"),
        };
        let title = match (options, english) {
            (HtmlExportOptions::Png { parts: 2.., .. }, true) => {
                "Save PNG parts in a new folder named after the file".into()
            }
            (HtmlExportOptions::Png { parts: 2.., .. }, false) => {
                "分段 PNG 将保存到以文件名命名的新文件夹".into()
            }
            (_, true) => format!("Export {label}"),
            (_, false) => format!("导出 {label}"),
        };
        let selection = rfd::AsyncFileDialog::new()
            .set_parent(&webview.window())
            .set_title(title)
            .set_file_name(file_name)
            .add_filter(label, &[extension])
            .save_file()
            .await
            .ok_or(AppError::ExportCancelled)?;
        let path = selection.path();
        let name = path.file_name().ok_or(AppError::InvalidParams)?;
        if !path
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case(extension))
        {
            return Err(AppError::InvalidParams);
        }
        let directory = path
            .parent()
            .ok_or(AppError::InvalidParams)?
            .canonicalize()
            .map_err(|_| AppError::IoError)?;
        let path = directory.join(name);
        let replacement = target_revision(&path)?;
        Ok(SaveDestination { path, replacement })
    }

    #[cfg(test)]
    fn export_to(
        source: &Path,
        target: &Path,
        chrome: &Path,
        expected_hash: &str,
        replacement: Option<FileRevision>,
        job: Reservation,
        progress: impl Fn(usize, usize),
    ) -> Result<String, AppError> {
        export_selected(
            source,
            target,
            chrome,
            expected_hash,
            replacement,
            job,
            HtmlExportOptions::Pdf {
                allow_copy: true,
                allow_edit: true,
            },
            progress,
        )
    }

    fn export_selected(
        source: &Path,
        target: &Path,
        chrome: &Path,
        expected_hash: &str,
        replacement: Option<FileRevision>,
        job: Reservation,
        options: HtmlExportOptions,
        progress: impl Fn(usize, usize),
    ) -> Result<String, AppError> {
        verify_source(source, expected_hash)?;
        let parent = target.parent().ok_or(AppError::InvalidParams)?;
        if let HtmlExportOptions::Png { scale, parts } = options {
            if parts > 1 {
                return export_png_parts(
                    source,
                    target,
                    chrome,
                    expected_hash,
                    job,
                    scale,
                    parts,
                    progress,
                );
            }
        }
        let mut file = tempfile::NamedTempFile::new_in(parent).map_err(|_| AppError::IoError)?;
        let cancelled = Arc::clone(&job.0);
        let result = match options {
            HtmlExportOptions::Pdf { .. } => {
                html_pdf::render(chrome, source, cancelled, &mut file, progress).map(|_| ())
            }
            HtmlExportOptions::Pptx { viewport } => {
                html_pdf::render_pptx(chrome, source, cancelled, viewport, &mut file, progress)
            }
            HtmlExportOptions::Png { scale, parts } => html_pdf::render_png(
                chrome,
                source,
                cancelled,
                scale,
                parts,
                |_| file.reopen().map_err(|error| error.to_string()),
                progress,
            ),
        };
        if job.0.load(Ordering::Acquire) {
            return Err(AppError::ExportCancelled);
        }
        result.map_err(AppError::HtmlExportFailed)?;
        if let HtmlExportOptions::Pdf {
            allow_copy,
            allow_edit,
        } = options
        {
            if !allow_copy || !allow_edit {
                file = restrict_pdf(parent, file, allow_copy, allow_edit)?;
            }
        }
        verify_source(source, expected_hash)?;
        file.as_file().sync_all().map_err(|_| AppError::IoError)?;
        // Serialize cancellation with the commit boundary. No-clobber protects
        // a file created after the save dialog has already closed.
        let _slot = JOB.lock().map_err(|_| AppError::InternalError)?;
        if job.0.load(Ordering::Acquire) {
            return Err(AppError::ExportCancelled);
        }
        commit_destination(file, target, replacement)?;
        Ok(target.to_string_lossy().into_owned())
    }

    #[cfg(target_os = "macos")]
    fn restrict_pdf(
        directory: &Path,
        source: tempfile::NamedTempFile,
        allow_copy: bool,
        allow_edit: bool,
    ) -> Result<tempfile::NamedTempFile, AppError> {
        use objc2::{
            rc::{autoreleasepool, Retained},
            runtime::{AnyObject, Bool},
        };
        use objc2_foundation::{NSData, NSDictionary, NSNumber, NSObject, NSString, NSURL};

        #[link(name = "PDFKit", kind = "framework")]
        extern "C" {
            static PDFDocumentOwnerPasswordOption: &'static NSString;
        }
        #[link(name = "CoreGraphics", kind = "framework")]
        extern "C" {
            static kCGPDFContextAccessPermissions: &'static NSString;
        }

        let failure =
            || AppError::HtmlExportFailed("macOS could not apply the PDF permissions".into());
        let output = tempfile::NamedTempFile::new_in(directory).map_err(|_| AppError::IoError)?;
        autoreleasepool(|_| {
            let open = |url: &NSURL| -> Option<Retained<AnyObject>> {
                let document = objc2::class!(PDFDocument);
                let allocated: objc2::rc::Allocated<AnyObject> =
                    unsafe { objc2::msg_send![document, alloc] };
                unsafe { objc2::msg_send![allocated, initWithURL: url] }
            };
            let url = |path: &Path| NSURL::from_file_path(path).ok_or(AppError::InvalidParams);
            let document = open(&*url(source.path())?).ok_or_else(failure)?;
            let owner = NSString::from_str(&uuid::Uuid::new_v4().simple().to_string());
            // Printing and accessibility stay available. Editing includes page
            // assembly, comments, and forms, as well as changes to content.
            let mut permissions = 0b0010_0011;
            if allow_copy {
                permissions |= 1 << 4;
            }
            if allow_edit {
                permissions |= 0b1100_1100;
            }
            let mask = NSNumber::numberWithUnsignedInteger(permissions);
            // Use the PDFKit option when available, with the CoreGraphics
            // option on versions before macOS 12.
            let access = unsafe {
                let symbol = libc::dlsym(
                    libc::RTLD_DEFAULT,
                    c"PDFDocumentAccessPermissionsOption".as_ptr(),
                )
                .cast::<&'static NSString>();
                symbol
                    .as_ref()
                    .copied()
                    .unwrap_or(kCGPDFContextAccessPermissions)
            };
            let options = NSDictionary::<NSString, NSObject>::from_slices(
                &[unsafe { PDFDocumentOwnerPasswordOption }, access],
                &[&owner, &mask],
            );
            let data: Option<Retained<NSData>> =
                unsafe { objc2::msg_send![&document, dataRepresentationWithOptions: &*options] };
            use std::io::Write;
            let mut file = output.as_file();
            file.write_all(&data.ok_or_else(failure)?.to_vec())
                .map_err(|_| AppError::IoError)?;
            let saved = open(&*url(output.path())?).ok_or_else(failure)?;
            let encrypted: Bool = unsafe { objc2::msg_send![&saved, isEncrypted] };
            let locked: Bool = unsafe { objc2::msg_send![&saved, isLocked] };
            let copying: Bool = unsafe { objc2::msg_send![&saved, allowsCopying] };
            let editing: Bool = unsafe { objc2::msg_send![&saved, allowsDocumentChanges] };
            let assembly: Bool = unsafe { objc2::msg_send![&saved, allowsDocumentAssembly] };
            if !encrypted.as_bool()
                || locked.as_bool()
                || copying.as_bool() != allow_copy
                || editing.as_bool() != allow_edit
                || assembly.as_bool() != allow_edit
            {
                return Err(failure());
            }
            Ok(output)
        })
    }

    #[cfg(windows)]
    fn restrict_pdf(
        directory: &Path,
        source: tempfile::NamedTempFile,
        allow_copy: bool,
        allow_edit: bool,
    ) -> Result<tempfile::NamedTempFile, AppError> {
        use lopdf::{
            encryption::crypt_filters::{Aes128CryptFilter, CryptFilter},
            Document, EncryptionState, EncryptionVersion, Permissions,
        };
        use std::collections::BTreeMap;

        let failure = |error: lopdf::Error| {
            AppError::HtmlExportFailed(format!("Could not apply PDF permissions: {error}"))
        };
        let mut document = Document::load(source.path()).map_err(failure)?;
        let mut permissions = Permissions::PRINTABLE
            | Permissions::COPYABLE_FOR_ACCESSIBILITY
            | Permissions::PRINTABLE_IN_HIGH_QUALITY;
        if allow_copy {
            permissions |= Permissions::COPYABLE;
        }
        if allow_edit {
            permissions |= Permissions::MODIFIABLE
                | Permissions::ANNOTABLE
                | Permissions::FILLABLE
                | Permissions::ASSEMBLABLE;
        }
        let owner = uuid::Uuid::new_v4().simple().to_string();
        if !document.trailer.has(b"ID") {
            use lopdf::Object;
            let id = uuid::Uuid::new_v4().as_bytes().to_vec();
            document.trailer.set(
                "ID",
                vec![
                    Object::string_literal(id.clone()),
                    Object::string_literal(id),
                ],
            );
        }
        let cipher: Arc<dyn CryptFilter> = Arc::new(Aes128CryptFilter);
        let state = EncryptionState::try_from(EncryptionVersion::V4 {
            document: &document,
            encrypt_metadata: true,
            crypt_filters: BTreeMap::from([(b"StdCF".to_vec(), cipher)]),
            stream_filter: b"StdCF".to_vec(),
            string_filter: b"StdCF".to_vec(),
            owner_password: &owner,
            user_password: "",
            permissions,
        })
        .map_err(|error| {
            AppError::HtmlExportFailed(format!("Could not set PDF permissions: {error}"))
        })?;
        document.encrypt(&state).map_err(failure)?;
        let mut output =
            tempfile::NamedTempFile::new_in(directory).map_err(|_| AppError::IoError)?;
        document
            .save_to(&mut output)
            .map_err(|_| AppError::IoError)?;
        Ok(output)
    }

    fn publish_directory(from: &Path, to: &Path) -> Result<(), AppError> {
        #[cfg(target_os = "macos")]
        let moved = {
            use std::{ffi::CString, os::unix::ffi::OsStrExt};
            let from =
                CString::new(from.as_os_str().as_bytes()).map_err(|_| AppError::InvalidParams)?;
            let to =
                CString::new(to.as_os_str().as_bytes()).map_err(|_| AppError::InvalidParams)?;
            unsafe { libc::renamex_np(from.as_ptr(), to.as_ptr(), libc::RENAME_EXCL) == 0 }
        };
        #[cfg(windows)]
        let moved = {
            use std::os::windows::ffi::OsStrExt;
            use windows_sys::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_WRITE_THROUGH};
            let from: Vec<u16> = from.as_os_str().encode_wide().chain(Some(0)).collect();
            let to: Vec<u16> = to.as_os_str().encode_wide().chain(Some(0)).collect();
            unsafe { MoveFileExW(from.as_ptr(), to.as_ptr(), MOVEFILE_WRITE_THROUGH) != 0 }
        };
        if moved {
            return Ok(());
        }
        if std::io::Error::last_os_error().kind() == std::io::ErrorKind::AlreadyExists
            || fs::symlink_metadata(to).is_ok()
        {
            return Err(AppError::HtmlExportTargetExists);
        }
        Err(AppError::IoError)
    }

    fn export_png_parts(
        source: &Path,
        target: &Path,
        chrome: &Path,
        expected_hash: &str,
        job: Reservation,
        scale: u64,
        parts: usize,
        progress: impl Fn(usize, usize),
    ) -> Result<String, AppError> {
        let stem = target.file_stem().ok_or(AppError::InvalidParams)?;
        let parent = target.parent().ok_or(AppError::InvalidParams)?;
        let mut directory_name = stem.to_os_string();
        directory_name.push("-PNG");
        let destination = parent.join(directory_name);
        match fs::symlink_metadata(&destination) {
            Ok(_) => return Err(AppError::HtmlExportTargetExists),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => return Err(AppError::IoError),
        }
        let staging = tempfile::tempdir_in(parent).map_err(|_| AppError::IoError)?;
        let result = html_pdf::render_png(
            chrome,
            source,
            Arc::clone(&job.0),
            scale,
            parts,
            |index| {
                let mut name = stem.to_os_string();
                name.push(format!("-{:03}.png", index + 1));
                fs::File::create(staging.path().join(name)).map_err(|error| error.to_string())
            },
            progress,
        );
        if job.0.load(Ordering::Acquire) {
            return Err(AppError::ExportCancelled);
        }
        result.map_err(AppError::HtmlExportFailed)?;
        verify_source(source, expected_hash)?;
        let _slot = JOB.lock().map_err(|_| AppError::InternalError)?;
        if job.0.load(Ordering::Acquire) {
            return Err(AppError::ExportCancelled);
        }
        // Publish the complete directory in one same-volume, no-replace operation.
        publish_directory(staging.path(), &destination)?;
        Ok(destination.to_string_lossy().into_owned())
    }

    fn commit_destination(
        file: tempfile::NamedTempFile,
        target: &Path,
        replacement: Option<FileRevision>,
    ) -> Result<(), AppError> {
        if let Some(replacement) = replacement {
            if target_revision(target)? != Some(replacement) {
                return Err(AppError::HtmlExportTargetExists);
            }
            file.persist(target).map_err(|_| AppError::IoError)?;
            return Ok(());
        }
        file.persist_noclobber(target).map_err(|error| {
            if error.error.kind() == std::io::ErrorKind::AlreadyExists {
                AppError::HtmlExportTargetExists
            } else {
                AppError::IoError
            }
        })?;
        Ok(())
    }

    fn source_path(
        webview: &tauri::Webview,
        state: &AppState,
        item_id: i64,
    ) -> Result<PathBuf, AppError> {
        if webview.label() != "main" {
            return Err(AppError::InvalidSession);
        }
        let item = state.database.get_item_detail(item_id)?;
        if item.summary.file_type != "html" {
            return Err(AppError::UnsupportedFileType);
        }
        PathBuf::from(&item.summary.file_path)
            .canonicalize()
            .map_err(|_| AppError::IoError)
    }

    pub async fn inspect(
        webview: tauri::Webview,
        state: tauri::State<'_, AppState>,
        item_id: i64,
        expected_hash: String,
        page: usize,
    ) -> Result<HtmlExportPreview, AppError> {
        let source = source_path(&webview, &state, item_id)?;
        let chrome = find_system_chromium_executable().ok_or(AppError::ExportEngineUnavailable)?;
        tauri::async_runtime::spawn_blocking(move || {
            verify_source(&source, &expected_hash)?;
            let info =
                html_pdf::inspect(&chrome, &source, page).map_err(AppError::HtmlExportFailed)?;
            verify_source(&source, &expected_hash)?;
            let png_parts = [html_pdf::png_parts(&info, 1), html_pdf::png_parts(&info, 2)];
            Ok(HtmlExportPreview {
                pages: info.pages,
                width: info.width,
                height: info.height,
                preview: SlidePreview {
                    page: info.preview.page,
                    image: info.preview.image,
                },
                png_parts,
            })
        })
        .await
        .map_err(|_| AppError::InternalError)?
    }

    pub async fn export(
        webview: tauri::Webview,
        state: tauri::State<'_, AppState>,
        item_id: i64,
        job_id: String,
        expected_file_hash: String,
        language: Option<String>,
        options: HtmlExportOptions,
    ) -> Result<String, AppError> {
        if matches!(
            options,
            HtmlExportOptions::Png { scale: 0 | 3.., .. }
                | HtmlExportOptions::Png {
                    parts: 0 | 501..,
                    ..
                }
        ) {
            return Err(AppError::InvalidParams);
        }
        let chrome = find_system_chromium_executable().ok_or(AppError::ExportEngineUnavailable)?;
        let source = source_path(&webview, &state, item_id)?;
        let job = reserve(job_id.clone())?;
        verify_source(&source, &expected_file_hash)?;
        let name = source
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("presentation");
        let extension = match options {
            HtmlExportOptions::Pdf { .. } => "pdf",
            HtmlExportOptions::Png { .. } => "png",
            HtmlExportOptions::Pptx { .. } => "pptx",
        };
        let destination = select_destination(
            &webview,
            format!("{name}.{extension}"),
            language.as_deref() == Some("en-US"),
            options,
        )
        .await?;
        if job.0.load(Ordering::Acquire) {
            return Err(AppError::ExportCancelled);
        }
        let _ = webview.emit(
            "html-export-progress",
            serde_json::json!({
                "jobId": job_id, "page": 0, "total": 0,
                "destination": if matches!(options, HtmlExportOptions::Png { parts: 2.., .. }) {
                    destination.path.with_extension("").as_os_str().to_string_lossy().into_owned() + "-PNG"
                } else {
                    destination.path.to_string_lossy().into_owned()
                }
            }),
        );
        tauri::async_runtime::spawn_blocking(move || {
            export_selected(
                &source,
                &destination.path,
                &chrome,
                &expected_file_hash,
                destination.replacement,
                job,
                options,
                |page, total| {
                    let _ = webview.emit(
                        "html-export-progress",
                        serde_json::json!({
                            "jobId": job_id, "page": page, "total": total
                        }),
                    );
                },
            )
        })
        .await
        .map_err(|_| AppError::InternalError)?
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        fn presentation_fixture(name: &str) -> PathBuf {
            Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("../docs/presentations/native-presentation-sample")
                .join(name)
                .canonicalize()
                .unwrap()
        }

        #[test]
        fn confirmed_pdf_replacement_is_bound_to_the_selected_file_revision() {
            let directory = tempfile::tempdir().unwrap();
            let target = directory.path().join("演示样稿.pdf");
            let temporary = |bytes: &[u8]| {
                use std::io::Write;
                let mut file = tempfile::NamedTempFile::new_in(directory.path()).unwrap();
                file.write_all(bytes).unwrap();
                file
            };
            fs::write(&target, b"old PDF").unwrap();
            let original = target_revision(&target).unwrap();
            assert!(matches!(
                commit_destination(temporary(b"new PDF"), &target, None),
                Err(AppError::HtmlExportTargetExists)
            ));
            assert_eq!(fs::read(&target).unwrap(), b"old PDF");
            fs::write(&target, b"concurrent edit").unwrap();
            assert!(matches!(
                commit_destination(temporary(b"new PDF"), &target, original),
                Err(AppError::HtmlExportTargetExists)
            ));
            assert_eq!(fs::read(&target).unwrap(), b"concurrent edit");
            let confirmed = target_revision(&target).unwrap();
            commit_destination(temporary(b"new PDF"), &target, confirmed).unwrap();
            assert_eq!(fs::read(&target).unwrap(), b"new PDF");
            assert_eq!(directory.path().read_dir().unwrap().count(), 1);
        }

        #[cfg(windows)]
        #[test]
        #[ignore = "requires the installed Windows system browser"]
        fn windows_html_export_all_formats_smoke() {
            let chrome = find_system_chromium_executable().expect("installed Edge or Chrome");
            let source = presentation_fixture("index.html");
            let hash = content_hash_bytes(&fs::read(&source).unwrap());
            let directory = tempfile::tempdir().unwrap();
            let preview = html_pdf::inspect(&chrome, &source, 2).unwrap();
            assert_eq!((preview.pages, preview.preview.page), (3, 2));
            for (extension, options, signature) in [
                (
                    "pdf",
                    HtmlExportOptions::Pdf {
                        allow_copy: false,
                        allow_edit: false,
                    },
                    &b"%PDF-"[..],
                ),
                (
                    "png",
                    HtmlExportOptions::Png { scale: 1, parts: 1 },
                    &b"\x89PNG"[..],
                ),
                (
                    "pptx",
                    HtmlExportOptions::Pptx { viewport: None },
                    &b"PK"[..],
                ),
            ] {
                let path = directory.path().join(format!("演示样稿.{extension}"));
                let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
                export_selected(
                    &source,
                    &path,
                    &chrome,
                    &hash,
                    None,
                    job,
                    options,
                    |_, _| {},
                )
                .unwrap();
                assert!(fs::read(&path).unwrap().starts_with(signature));
                match extension {
                    "pdf" => {
                        let document = lopdf::Document::load(path).unwrap();
                        assert_eq!(document.get_pages().len(), 3);
                        let permissions = document
                            .encryption_state
                            .as_ref()
                            .expect("protected PDF")
                            .permissions();
                        assert!(!permissions.intersects(
                            lopdf::Permissions::COPYABLE | lopdf::Permissions::MODIFIABLE
                        ));
                    }
                    "png" => assert_eq!(image::image_dimensions(path).unwrap(), (1920, 3240)),
                    _ => {}
                }
            }
        }

        #[test]
        #[ignore = "requires the installed system browser"]
        fn exports_native_charts_with_editable_data() {
            let browser = find_system_chromium_executable().expect("system Chromium browser");
            let source = presentation_fixture("charts.html");
            let hash = content_hash_bytes(&fs::read(&source).unwrap());
            let directory = tempfile::tempdir().unwrap();
            let path = directory.path().join("charts.pptx");
            let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
            export_selected(
                &source,
                &path,
                &browser,
                &hash,
                None,
                job,
                HtmlExportOptions::Pptx { viewport: None },
                |_, _| {},
            )
            .unwrap();
            // The package and its workbooks use stored ZIP entries.
            let package = fs::read(&path).unwrap();
            for entry in [
                "<c:barChart>",
                "<c:lineChart>",
                "<c:pieChart>",
                "Sheet1!$C$2:$C$4",
                r#"<c r="C4"><v>17</v></c>"#,
                "../embeddings/chart-1-3.xlsx",
                "<c:v>线上</c:v>",
            ] {
                assert!(
                    package
                        .windows(entry.len())
                        .any(|window| window == entry.as_bytes()),
                    "missing chart or workbook data: {entry}"
                );
            }
            if let Some(evidence) = std::env::var_os("NUTBOOK_HTML_CHART_TEST_OUTPUT") {
                fs::copy(path, PathBuf::from(evidence)).unwrap();
            }
        }

        #[test]
        #[ignore = "requires system Chrome and permission to bind a local capture port"]
        fn exports_pdf_permission_combinations_and_requested_preview() {
            let chrome = find_system_chromium_executable().expect("system Chrome");
            let source = presentation_fixture("index.html");
            let directory = tempfile::tempdir().unwrap();
            let evidence = std::env::var_os("NUTBOOK_HTML_PDF_TEST_OUTPUT").map(PathBuf::from);
            let hash = content_hash_bytes(&fs::read(&source).unwrap());
            let preview_source = &presentation_fixture("long-pages.html");
            let started = std::time::Instant::now();
            let first = html_pdf::inspect(&chrome, preview_source, 1).unwrap();
            println!(
                "First preview of {} pages: {:?}",
                first.pages,
                started.elapsed()
            );
            let started = std::time::Instant::now();
            let last = html_pdf::inspect(&chrome, preview_source, first.pages).unwrap();
            println!("Last page requested on demand: {:?}", started.elapsed());
            assert_eq!(last.preview.page, first.pages);
            assert_ne!(last.preview.image, first.preview.image);
            assert!(html_pdf::inspect(&chrome, preview_source, first.pages + 1).is_err());

            for (allow_copy, allow_edit) in
                [(true, true), (false, true), (true, false), (false, false)]
            {
                let name = format!("permissions-{allow_copy}-{allow_edit}.pdf");
                let target = directory.path().join(&name);
                let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
                export_selected(
                    &source,
                    &target,
                    &chrome,
                    &hash,
                    None,
                    job,
                    HtmlExportOptions::Pdf {
                        allow_copy,
                        allow_edit,
                    },
                    |_, _| {},
                )
                .unwrap();
                if let Some(evidence) = &evidence {
                    fs::copy(target, evidence.join(name)).unwrap();
                }
            }
        }

        #[test]
        #[ignore = "requires system Chrome and permission to bind a local capture port"]
        fn split_png_cancel_and_collision_preserve_destination() {
            let source = presentation_fixture("long-pages.html");
            let chrome = find_system_chromium_executable().expect("system Chrome");
            let hash = content_hash_bytes(&fs::read(&source).unwrap());
            let directory = tempfile::tempdir().unwrap();
            let target = directory.path().join("slides.png");
            let published = directory.path().join("slides-PNG");
            let info = html_pdf::inspect(&chrome, &source, 1).unwrap();
            let parts = html_pdf::png_parts(&info, 1);
            assert!(parts > 1);
            let options = HtmlExportOptions::Png { scale: 1, parts };
            let id = uuid::Uuid::new_v4().to_string();
            let job = reserve(id.clone()).unwrap();
            let result = export_selected(
                &source,
                &target,
                &chrome,
                &hash,
                None,
                job,
                options,
                |page, _| {
                    if page == 1 {
                        cancel(&id)
                    }
                },
            );
            assert!(matches!(result, Err(AppError::ExportCancelled)));
            assert_eq!(directory.path().read_dir().unwrap().count(), 0);

            let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
            let result = export_selected(
                &source,
                &target,
                &chrome,
                &hash,
                None,
                job,
                options,
                |page, total| {
                    if page == total {
                        fs::create_dir(&published).unwrap();
                        fs::write(published.join("owner.txt"), b"independent owner").unwrap();
                    }
                },
            );
            assert!(matches!(result, Err(AppError::HtmlExportTargetExists)));
            assert_eq!(directory.path().read_dir().unwrap().count(), 1);
            assert_eq!(
                fs::read(published.join("owner.txt")).unwrap(),
                b"independent owner"
            );
            assert_eq!(published.read_dir().unwrap().count(), 1);
        }

        #[test]
        #[ignore = "requires system Chrome and permission to bind a local capture port"]
        fn exports_library_png_and_pptx() {
            let chrome = find_system_chromium_executable().expect("system Chrome");
            let standard = presentation_fixture("index.html");
            let temporary = tempfile::tempdir().unwrap();
            let evidence = std::env::var_os("NUTBOOK_HTML_PDF_TEST_OUTPUT").map(PathBuf::from);
            let output = evidence.as_deref().unwrap_or(temporary.path());
            let decks = [
                (standard, "standard"),
                (presentation_fixture("long-pages.html"), "long-pages"),
            ];
            for (source, name) in decks {
                let expected = content_hash_bytes(&fs::read(&source).unwrap());
                let info = html_pdf::inspect(&chrome, &source, 1).unwrap();
                for scale in [1, 2] {
                    let parts = html_pdf::png_parts(&info, scale);
                    let target = output.join(format!("{name}-{scale}x.png"));
                    let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
                    let path = export_selected(
                        &source,
                        &target,
                        &chrome,
                        &expected,
                        None,
                        job,
                        HtmlExportOptions::Png { scale, parts },
                        |_, _| {},
                    )
                    .unwrap();
                    let files = if parts == 1 {
                        vec![PathBuf::from(path)]
                    } else {
                        fs::read_dir(path)
                            .unwrap()
                            .map(|entry| entry.unwrap().path())
                            .collect()
                    };
                    assert_eq!(files.len(), parts);
                    let mut rows = 0;
                    for file in files {
                        let decoder = png::Decoder::new(fs::File::open(&file).unwrap());
                        let mut reader = decoder.read_info().unwrap();
                        assert_eq!(u64::from(reader.info().width), info.width * scale);
                        assert!(reader.info().height <= 15_000);
                        assert_eq!(u64::from(reader.info().height) % (info.height * scale), 0);
                        rows += u64::from(reader.info().height);
                        let mut data = vec![0; reader.output_buffer_size()];
                        reader.next_frame(&mut data).unwrap();
                    }
                    assert_eq!(rows, info.height * scale * info.pages as u64);
                }
                let target = output.join(format!("{name}.pptx"));
                let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
                export_selected(
                    &source,
                    &target,
                    &chrome,
                    &expected,
                    None,
                    job,
                    HtmlExportOptions::Pptx { viewport: None },
                    |_, _| {},
                )
                .unwrap();
                assert!(fs::read(target).unwrap().starts_with(b"PK"));
            }
        }

        #[test]
        #[ignore = "requires system Chrome and permission to bind a local capture port"]
        fn exports_library_pdf_and_preserves_atomic_commit() {
            let chrome = find_system_chromium_executable().expect("system Chrome");
            let standard = presentation_fixture("index.html");
            let output = tempfile::tempdir().unwrap();
            let evidence = std::env::var_os("NUTBOOK_HTML_PDF_TEST_OUTPUT").map(PathBuf::from);
            let decks = [
                (standard.clone(), "standard.pdf"),
                (presentation_fixture("long-pages.html"), "long-pages.pdf"),
            ];
            for (source, name) in decks {
                let target = output.path().join(name);
                let expected = content_hash_bytes(&fs::read(&source).unwrap());
                let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
                export_to(&source, &target, &chrome, &expected, None, job, |_, _| {})
                    .unwrap_or_else(|error| panic!("{}: {error}", source.display()));
                assert!(fs::read(&target).unwrap().starts_with(b"%PDF-"));
                if let Some(evidence) = &evidence {
                    fs::copy(&target, evidence.join(name)).unwrap();
                }
                fs::remove_file(target).unwrap();
            }

            let expected = content_hash_bytes(&fs::read(&standard).unwrap());
            let target = output.path().join("adversarial.pdf");
            let id = uuid::Uuid::new_v4().to_string();
            let job = reserve(id.clone()).unwrap();
            let result = export_to(&standard, &target, &chrome, &expected, None, job, |_, _| {
                cancel(&id)
            });
            assert!(matches!(result, Err(AppError::ExportCancelled)));
            assert_eq!(output.path().read_dir().unwrap().count(), 0);

            let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
            let result = export_to(
                &standard,
                &target,
                &chrome,
                &expected,
                None,
                job,
                |page, _| {
                    if page == 0 {
                        fs::write(&target, b"independent owner").unwrap();
                    }
                },
            );
            assert!(matches!(result, Err(AppError::HtmlExportTargetExists)));
            assert_eq!(fs::read(&target).unwrap(), b"independent owner");
            assert_eq!(output.path().read_dir().unwrap().count(), 1);

            let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
            let result = export_to(
                &standard,
                &target,
                &chrome,
                "wrong revision",
                None,
                job,
                |_, _| {},
            );
            assert!(matches!(result, Err(AppError::EditConflict)));
            assert_eq!(fs::read(&target).unwrap(), b"independent owner");

            let missing = tempfile::tempdir().unwrap();
            let missing_source = missing.path().join("index.html");
            fs::copy(&standard, &missing_source).unwrap();
            let missing_target = output.path().join("missing.pdf");
            let job = reserve(uuid::Uuid::new_v4().to_string()).unwrap();
            let result = export_to(
                &missing_source,
                &missing_target,
                &chrome,
                &expected,
                None,
                job,
                |_, _| {},
            );
            assert!(matches!(result, Err(AppError::HtmlExportFailed(_))));
            assert!(!missing_target.exists());
            assert_eq!(output.path().read_dir().unwrap().count(), 1);
        }
    }
}

#[tauri::command]
pub async fn export_html_presentation(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    item_id: i64,
    job_id: String,
    expected_file_hash: String,
    language: Option<String>,
    options: HtmlExportOptions,
) -> Result<String, AppError> {
    #[cfg(any(target_os = "macos", windows))]
    return desktop::export(
        webview,
        state,
        item_id,
        job_id,
        expected_file_hash,
        language,
        options,
    )
    .await;
    #[cfg(not(any(target_os = "macos", windows)))]
    {
        let _ = (
            webview,
            state,
            item_id,
            job_id,
            expected_file_hash,
            language,
            options,
        );
        Err(AppError::ExportEngineUnavailable)
    }
}

#[tauri::command]
pub fn cancel_html_export(webview: tauri::Webview, job_id: String) -> Result<(), AppError> {
    if webview.label() != "main" {
        return Err(AppError::InvalidSession);
    }
    #[cfg(any(target_os = "macos", windows))]
    desktop::cancel(&job_id);
    #[cfg(not(any(target_os = "macos", windows)))]
    let _ = job_id;
    Ok(())
}
