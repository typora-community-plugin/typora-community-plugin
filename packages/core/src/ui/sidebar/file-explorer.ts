import decorate from "@plylrnsdy/decorate.js"
import { editor, File } from "typora"
import type { App } from 'src/app'
import { Component } from 'src/component'
import path from 'src/path'
import { View } from 'src/ui/view'
import type { Sidebar } from './sidebar'
import type { Workspace } from "src/ui/workspace"
import { BUILT_IN, WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import { html } from "src/utils/html"


export class FileExplorer extends View {

  private id = 'core.file-explorer'

  private _showNotSupportedFile: ShowNotSupportedFile

  constructor(private app: App, workspace: Workspace, private sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('file-library') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      id: this.id,
      title: app.i18n.t.ribbon.files,
      icon: html`<i class="fa fa-folder-o"></i>`,
      onclick: () => sidebar.switch(FileExplorer),
    })

    this._showNotSupportedFile = new ShowNotSupportedFile(app)
  }

  onload() {
    this.app.workspace.getViewByType(WorkspaceRibbon)!.activeButton(this.id)
  }

  show() {
    editor.library.fileSearch.hide()
    editor.library.switch("", true)
  }

  hide() {
    this.sidebar.wrapperEl.classList.remove('active-tab-files')
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
    const fileLibraryEl = document.getElementById('file-library')

    this.registerDomEvent(fileLibraryEl, 'mouseenter', () => {
      File.SupportedFiles.indexOf = () => 1
    })

    this.registerDomEvent(fileLibraryEl, 'mouseleave', () => {
      delete File.SupportedFiles.indexOf
    })

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
