fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        // tauri-build's resource defaults to rustc-link-arg-bins, leaving lib
        // tests/examples without Common Controls v6. Link one manifest to every
        // executable; retain Tauri's binary icons/version resources without a
        // duplicate manifest entry.
        tauri_build::try_build(
            tauri_build::Attributes::new().windows_attributes(
                tauri_build::WindowsAttributes::new_without_app_manifest(),
            ),
        ).expect("Tauri Windows resources");
        println!("cargo:rerun-if-changed=windows.manifest");
        println!("cargo:rerun-if-changed=windows-manifest.rc");
        embed_resource::compile_for_everything("windows-manifest.rc", embed_resource::NONE)
            .manifest_required().expect("Windows executable manifest");
    } else {
        tauri_build::build();
    }
}
