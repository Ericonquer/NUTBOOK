"""Headless Finder metadata for the macOS release DMG.

This intentionally has no background image: the installer is the native Finder
canvas with only the application and Applications icons at a readable size.
"""

import os

application = defines["app"]
appname = os.path.basename(application)

files = [application]
symlinks = {"Applications": "/Applications"}
format = "UDZO"

window_rect = ((100, 100), (660, 400))
default_view = "icon-view"
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False

arrange_by = None
grid_spacing = 100
label_pos = "bottom"
text_size = 16
icon_size = 128
icon_locations = {
    appname: (180, 170),
    "Applications": (480, 170),
}
