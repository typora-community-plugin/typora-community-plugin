# macOS file operations helper

On macOS, Typora shows an "Allow Typora to run this shell command?" authorization dialog every time it runs a shell command, and there is no "remember my choice". Most file operations in the plugin system (saving settings, indexing metadata, installing and uninstalling plugins, etc.) used to go through shell commands, so the dialog kept popping up.

[`typora-helper`](https://github.com/typora-community-plugin/typora-macos-helper) is a small local program that provides file operations as a background service. After the plugin system starts, it connects to the helper first and only falls back to running shell commands one by one if it cannot connect. It only provides file operations such as reading/writing, copying, moving, deleting, and listing directories; it cannot execute arbitrary commands.

After you install it and let it take over:

- File operations no longer trigger the authorization dialog.
- If you do not enable the persistent service, Typora may show the dialog once on each launch (to start the helper); once you allow it, no more prompts appear for the rest of that session.
- Other features that still need to run system commands may still trigger dialogs according to the system's rules.

> Windows and Linux do not need this helper: only macOS asks for authorization for shell commands.

## Do you need to install it?

| Situation | Recommendation |
|------|------|
| Using macOS and frequently interrupted by file operation authorization dialogs | Install |
| Using macOS, see the dialog only occasionally and do not mind | Optional; plugin system features are unaffected |
| Windows / Linux | Not needed |

Requirements: macOS 13 Ventura or later, with [Homebrew](https://brew.sh/) installed.

## Installation

```bash
brew install typora-community-plugin/tap/typora-helper
```

After installation, quit Typora completely and restart it. If "Allow Typora to run this shell command?" appears on startup, click Allow; no more dialogs will appear for file operations in this session.

**Do not** click "Cancel" in the authorization dialog: canceling makes this session give up on the helper, and subsequent file operations will ask again one by one until you restart Typora.

## Enabling persistent mode (zero dialogs)

The installation above uses "start on demand", so Typora may still show a dialog once on each launch. If you want to eliminate even that one, you can run the helper as a persistent background service:

```bash
brew services start typora-helper
```

Once enabled, Typora connects to the existing service on startup and no longer needs the authorization dialog to start the helper. The helper stays resident after login and uses very few resources. When you no longer need it, run:

```bash
brew services stop typora-helper
```

## Verifying it works

1. Restart Typora, open or save a document, and change a setting once.
2. If "Allow Typora to run this shell command?" no longer appears, the helper has taken over.
3. You can also confirm the process exists in a terminal:

   ```bash
   pgrep -fl typora-helper
   ```

   You should see a line containing `serve`.

In on-demand mode, the helper exits automatically about two minutes after Typora quits; in persistent mode it stays in the background.

## Upgrading

```bash
brew upgrade typora-helper
```

If persistent mode is enabled, run `brew services restart typora-helper` after upgrading so the background service switches to the new version; in on-demand mode, the new version is used automatically the next time Typora starts.

## Uninstalling

```bash
brew services stop typora-helper    # only needed if persistent mode was enabled
brew uninstall typora-helper
```

After uninstalling, the plugin system keeps working as usual; file operations simply go back to running one by one with authorization dialogs.

## FAQ

| Symptom | What to do |
|------|------|
| Every file operation still triggers a dialog | The helper has not taken over. Run `typora-helper --version` first to confirm it runs, then quit and restart Typora completely |
| You clicked "Cancel" on startup | This session has given up on the helper; restart Typora and choose Allow |
| The vault is in a protected folder such as Documents, Desktop, or Downloads, and operations report a permission error | Open "System Settings → Privacy & Security → Files and Folders" and allow `typora-helper` to access that folder |
| You want to restore the original dialog behavior | Uninstall as described above, or run `brew services stop typora-helper` and switch to on-demand mode |

## Related pages

- [How to install](./1a-installation.md)
- [How to uninstall](./1b-uninstall.md)
- [Settings overview](./3-settings.md)
