import * as _ from 'lodash'
import * as path from 'path'
import { editor, File } from "typora"
import decorate from "@plylrnsdy/decorate.js"
import type { App } from 'src/app'
import { View } from 'src/ui/view'
import type { Workspace } from "src/ui/workspace"
import type { Sidebar } from './sidebar'
import { BUILT_IN, WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import { html } from "src/utils/html"
import { Component } from 'src/component'


export class FileExplorer extends View {

  private _showNotSupportedFile: ShowNotSupportedFile

  constructor(private app: App, workspace: Workspace, sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('file-library') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      id: 'core.file-explorer',
      title: app.i18n.t.ribbon.files,
      icon: html`<i class="fa fa-folder-o"></i>`,
      onclick: () => sidebar.switch(FileExplorer),
    })

    this._showNotSupportedFile = new ShowNotSupportedFile(app)
  }


  onload() {
  }

  onunload() {
  }


  show() {
    editor.library.fileSearch.hide()
    editor.library.switch("", true)
  }

  hide() {
    this.containerEl.parentElement!.classList.remove('active-tab-files')
  }
}

class ShowNotSupportedFile extends Component {

  constructor(private app: App) {
    super()

    const SETTING_KEY = 'showNotSupportedFile'

    if (app.settings.get(SETTING_KEY)) {
      this.load()
    }

    app.settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    File.SupportedFiles.indexOf = () => 1

    this.register(
      decorate(editor.library, 'openFile', fn => (file, callback) => {
        const ext = path.extname(file).slice(1)
        if (ext && !File.SupportedFiles.includes(ext)) {
          this.app.openFileWithDefaultApp(file)
          return
        }
        fn(file, callback)
      }))
  }

  onunload() {
    delete File.SupportedFiles.indexOf
  }
}
