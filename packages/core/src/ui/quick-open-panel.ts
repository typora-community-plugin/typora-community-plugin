import * as path from "path"
import { JSBridge, editor } from "typora"
import decorate from '@plylrnsdy/decorate.js'
import type { App } from "src/app"
import { Component } from "src/component"
import { View } from "./view"
import fs from 'src/fs/filesystem'


export class QuickOpenPanel extends View {

  private _ignoreFile: IgnoreFile
  private _quickOpenInCurrentWin: QuickOpenInCurrentWin

  constructor(private app: App) {
    super()

    this._ignoreFile = new IgnoreFile(app)
    this._quickOpenInCurrentWin = new QuickOpenInCurrentWin(app)
  }

}

class IgnoreFile extends Component {

  private _ignoredFiles: string[] = []

  constructor(private app: App) {
    super()

    const SETTING_KEY = 'ignoreFile'

    if (app.settings.get(SETTING_KEY)) {
      this.load()
    }

    app.settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {

    this._buildIgnoredFiles(this.app.settings.get('ignoreFileGlob'))

    this.app.settings.onChange('ignoreFileGlob', (_, glob) =>
      this._buildIgnoredFiles(glob)
    )

    // ignore files in folders
    this._removeIgnoredFiles()

    this.register(
      decorate.afterCall(editor.quickOpenPanel, 'initFileCache', () => {
        this._removeIgnoredFiles()
      }))

    // ignore files after files changed
    this.register(
      decorate.parameters(editor.quickOpenPanel, 'addInitFiles', (args) => {
        const [filePaths, fileNames, modifiedDates] = args
        for (let i = 0; i < filePaths.length; i++) {
          const file = filePaths[i]
          if (this._ignoredFiles.some(p => file.startsWith(p))) {
            filePaths[i] = null as any
            fileNames[i] = null as any
            modifiedDates[i] = null as any
          }
        }
        for (let i = 0; i < args.length; i++) {
          args[i] = (<any[]>args[i]).filter((o: any) => o)
        }
        return args
      }))
  }

  onunload() {
    editor.quickOpenPanel.cacheFolder(this.app.vault.path)
  }

  private _buildIgnoredFiles(glob: string) {
    this._ignoredFiles = glob
      .split(',')
      .map(folder => path.join(this.app.vault.path, folder))
  }

  private _removeIgnoredFiles() {
    this._ignoredFiles
      .forEach(folder => editor.quickOpenPanel.removeInitFiles(folder))
  }

}

class QuickOpenInCurrentWin extends Component {

  constructor(app: App) {
    super()

    const SETTING_KEY = 'quickOpenInCurrentWin'

    if (app.settings.get(SETTING_KEY)) {
      this.load()
    }

    app.settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    this.register(
      decorate(JSBridge, 'invoke', fn => async (...args) => {
        if (
          args[0] === 'app.openFileOrFolder' &&
          (await fs.stat(args[1])).isFile() &&
          !args[2].forceCreateWindow
        ) {
          editor.library.openFile(args[1])
          editor.library.refreshPanelCommand()
          return
        }
        return fn(...args)
      }))
  }

}
