# File & Link

Controls how Markdown links open and which files appear in the quick open panel. Mainly used together with [file tabs](./4a-workspace.md).

## Preview

![File & Link settings](../../assets/settings-modal.jpg)

## Where to find it

Plugin Settings modal (<kbd>Ctrl</kbd>+<kbd>.</kbd>) → File & Link.

## Settings

| Setting | Default | Effect | Notes |
|--------|--------|------|------|
| Open Markdown links in current window | On | When you <kbd>Ctrl</kbd>-click (or <kbd>⌘</kbd>-click on macOS) a Markdown link, open it in the current window instead of a new Typora window | Recommended when using file tabs |
| Markdown link without extension | Off | Automatically append `.md` when a link has no extension, e.g. `[Note](note)` opens `note.md` | Only affects relative links |
| Quick open file in current window | On | When you pick a file in Typora's native quick open panel, open it in the current window and record it in "recently opened" | Recommended when using file tabs |
| Ignore folder in quick open panel | On | When checked, files in matching folders are hidden from the quick open panel according to the rules in the input box on the right | Default value is `.git`; separate multiple folders with commas; paths are relative to the vault |

## Common usage

**Open links in a tab in the current window**

1. Check "Open Markdown links in current window".
2. <kbd>Ctrl</kbd>-click a relative link in a note; the target file opens in a new tab.
3. A plain click without <kbd>Ctrl</kbd> still goes through Typora's native behavior.

**Hide directories such as `.git` and `node_modules`**

1. Check "Ignore folder in quick open panel".
2. Enter `.git, node_modules, dist` in the input box.
3. Reopen the quick open panel; files in those directories no longer appear.

## Notes and limitations

- Exclusion rules only affect the **quick open panel**; they do not affect the file tree, search, or tabs.
- Extension completion only applies to relative Markdown links; `http(s)://` links and custom protocol links (such as `vscode://`) are unaffected.
- If the linked file does not exist, no message is shown; it is only written to the log.

## Related pages

- [Workspace](./4a-workspace.md)
- [Appearance](./3b-appearance.md)
- [Settings overview](./3-settings.md)
