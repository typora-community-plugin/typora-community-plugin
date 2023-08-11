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
import type { DisposeFunc } from "src/utils/types"


export class FileExplorer extends View {

  constructor(private app: App, workspace: Workspace, sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('file-library') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      title: app.i18n.t.ribbon.files,
      icon: html`<i class="fa fa-folder-o"></i>`,
      onclick: () => sidebar.switch(FileExplorer),
    })

    app.settings.onChange('showNotSupportedFile', (_, isEnabled) => {
      isEnabled
        ? this.showNotSupportedFile()
        : this.hideNotSupportedFile()
    })
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


  private disableOpenNotSupportedFile: DisposeFunc = _.noop

  private showNotSupportedFile() {
    File.SupportedFiles.indexOf = () => 1

    this.disableOpenNotSupportedFile =
      decorate(editor.library, 'openFile', fn => (file, callback) => {
        const ext = path.extname(file).slice(1)
        if (ext && !File.SupportedFiles.includes(ext)) {
          this.app.openFileWithDefaultApp(file)
          return
        }
        fn(file, callback)
      })
  }

  private hideNotSupportedFile() {
    delete File.SupportedFiles.indexOf
    this.disableOpenNotSupportedFile()
  }
}
