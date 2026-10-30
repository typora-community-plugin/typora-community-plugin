# File viewers

View images and play audio and video directly in file tabs without leaving Typora.

> Requires v2.10.33+. Requires [Workspace](./3d-internal-plugins.md) to be enabled.

## Preview

![File viewers](../../assets/user/file-views.jpg)

## Supported formats

| Viewer | Extensions |
|--------|--------|
| Image | `.jpg` `.jpeg` `.png` `.gif` `.bmp` `.webp` `.svg` `.ico` `.avif` |
| Audio | `.flac` `.m4a` `.mp3` `.ogg` `.wav` `.3gp` |
| Video | `.mkv` `.mov` `.mp4` `.ogv` `.webm` |

Files not listed here (such as `.pdf` and `.zip`) are still opened with the system default application.

## Usage

1. Open a file in one of the formats above from the file tree or the [quick open panel](./3a-file-and-link.md).
2. The file opens in a new tab with the built-in viewer:
   - Images are displayed at their original size in the tab and can be scrolled.
   - Audio and video provide the system's play, pause, progress bar, and volume controls.
3. Tabs can be closed, dragged, and split just like Markdown files.

## Settings

Plugin Settings modal → Core Plugins settings → Workspace → Main Editor Area: File Views.

| Setting | Default | Effect | Notes |
|--------|--------|------|------|
| Enable Audio View | On | Open audio files with the built-in player | When off, they are handed to the system default application |
| Enable Video View | On | Open video files with the built-in player | Same as above |
| Enable Image View | On | Open image files with the built-in viewer | Same as above |

## Notes and limitations

- Whether these files are **visible** in the file tree depends on [Appearance](./3b-appearance.md) → "Show not supported file". When that option is off, non-text files may not be listed in the file tree.
- After turning off the corresponding viewer switch, files open with the system default application and no longer appear in a tab.
- If the encoding is unsupported or the file is corrupted, the viewer area is blank and does not show the error reason.
- Video playback depends on system codecs; some container formats may play audio only or not play at all.

## Related pages

- [Workspace](./4a-workspace.md)
- [Appearance](./3b-appearance.md)
- [File & Link](./3a-file-and-link.md)
