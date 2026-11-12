// Both Office packages use regular ZIP entries. Store already-compressed
// media without spawning a platform-specific archive tool.
use std::{
    fs,
    io::Write,
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
};

pub(super) fn pack(
    root: &Path,
    output: &mut impl Write,
    cancelled: &AtomicBool,
) -> Result<(), String> {
    fn files(root: &Path, directory: &Path, paths: &mut Vec<String>) -> Result<(), String> {
        for entry in fs::read_dir(directory).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                files(root, &path, paths)?;
            } else {
                let parts = path.strip_prefix(root).map_err(|e| e.to_string())?;
                let name = parts
                    .iter()
                    .map(|part| part.to_str().ok_or("Invalid package filename"))
                    .collect::<Result<Vec<_>, _>>()?
                    .join("/");
                paths.push(name);
            }
        }
        Ok(())
    }
    fn write(output: &mut impl Write, data: &[u8]) -> Result<(), String> {
        output.write_all(data).map_err(|e| e.to_string())
    }
    fn u16_le(data: &mut Vec<u8>, value: u16) {
        data.extend_from_slice(&value.to_le_bytes());
    }
    fn u32_le(data: &mut Vec<u8>, value: u32) {
        data.extend_from_slice(&value.to_le_bytes());
    }
    fn fits(value: usize) -> Result<u32, String> {
        u32::try_from(value).map_err(|_| "Office package exceeds ZIP size limits".into())
    }

    let mut paths = Vec::new();
    files(root, root, &mut paths)?;
    paths.sort_unstable();
    let count = u16::try_from(paths.len()).map_err(|_| "Too many Office package parts")?;
    let mut index = Vec::new();
    let mut offset = 0usize;
    for name in paths {
        if cancelled.load(Ordering::Acquire) {
            return Err("Export cancelled".into());
        }
        let data = fs::read(root.join(&name)).map_err(|e| e.to_string())?;
        let name = name.as_bytes();
        let name_len = u16::try_from(name.len()).map_err(|_| "Office package path is too long")?;
        let size = fits(data.len())?;
        let crc = crc32fast::hash(&data);
        let mut common = Vec::with_capacity(26);
        for value in [20, 0x800, 0, 0, 33] {
            u16_le(&mut common, value);
        } // UTF-8, stored, 1980-01-01
        for value in [crc, size, size] {
            u32_le(&mut common, value);
        }
        u16_le(&mut common, name_len);
        u16_le(&mut common, 0);

        u32_le(&mut index, 0x02014b50);
        u16_le(&mut index, 20);
        index.extend_from_slice(&common);
        for value in [0, 0, 0] {
            u16_le(&mut index, value);
        }
        u32_le(&mut index, 0);
        u32_le(&mut index, fits(offset)?);
        index.extend_from_slice(name);

        write(output, &0x04034b50u32.to_le_bytes())?;
        write(output, &common)?;
        write(output, name)?;
        write(output, &data)?;
        offset += 4 + common.len() + name.len() + data.len();
    }
    let mut end = Vec::new();
    u32_le(&mut end, 0x06054b50);
    for value in [0, 0, count, count] {
        u16_le(&mut end, value);
    }
    u32_le(&mut end, fits(index.len())?);
    u32_le(&mut end, fits(offset)?);
    u16_le(&mut end, 0);
    write(output, &index)?;
    write(output, &end)
}
