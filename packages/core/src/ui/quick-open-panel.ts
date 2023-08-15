import * as path from "path"
import { editor } from "typora"
import decorate from '@plylrnsdy/decorate.js'
import type { App } from "src/app"
import { Component } from "src/component"
import { View } from "./view"


export class QuickOpenPanel extends View {

  private _ignoreFile: IgnoreFile

  constructor(private app: App) {
    super()

    this._ignoreFile = new IgnoreFile(app)
  }

  onload() {
    if (this.app.settings.get('ignoreFile')) {
      this._ignoreFile.load()
    }

    this.app.settings.onChange('ignoreFile', (_, isEnabled) => {
      isEnabled
        ? this._ignoreFile.load()
        : this._ignoreFile.unload()
    })
  }

  onunload() {
  }

}

class IgnoreFile extends Component {

  private _ignoredFiles: string[] = []

  constructor(private app: App) {
    super()
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
