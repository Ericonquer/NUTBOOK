"""Verify application and mounted-volume branding in the final release DMG."""

import subprocess
from pathlib import Path
import plistlib
import sys


def verify(mount_dir):
    root = Path(mount_dir)
    app = root / "NUTBOOK.app"
    with (app / "Contents" / "Info.plist").open("rb") as handle:
        icon_name = plistlib.load(handle)["CFBundleIconFile"]
    if not Path(icon_name).suffix:
        icon_name += ".icns"
    app_icon = app / "Contents" / "Resources" / icon_name
    volume_icon = root / ".VolumeIcon.icns"
    data = app_icon.read_bytes()
    if len(data) <= 8 or data[:4] != b"icns" or int.from_bytes(data[4:8], "big") != len(data):
        raise ValueError("Application icon is not a valid nonempty ICNS container")
    if volume_icon.read_bytes() != data:
        raise ValueError("DMG volume icon differs from the bundled application icon")
    finder_info = bytes.fromhex(subprocess.check_output(
        ["xattr", "-px", "com.apple.FinderInfo", str(root)], text=True
    ))
    if len(finder_info) != 32 or not int.from_bytes(finder_info[8:10], "big") & 0x0400:
        raise ValueError("DMG volume is missing the Finder custom-icon flag")
    print("DMG application icon, volume icon bytes and Finder custom-icon flag verified.")


if __name__ == "__main__":
    verify(sys.argv[1])
