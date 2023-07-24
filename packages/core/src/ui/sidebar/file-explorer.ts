import { View } from 'src/ui/view'
import type { Workspace } from "src/ui/workspace"
import type { Sidebar } from './sidebar'
import { BUILT_IN, WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import { editor } from "typora"
import { html } from "src/utils/html"
import type { App } from 'src/app'


export class FileExplorer extends View {

  constructor(app: App, workspace: Workspace, sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('file-library') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      title: app.i18n.t.ribbon.files,
      icon: html`<i class="fa fa-folder-o"></i>`,
      onclick: () => sidebar.switch(FileExplorer),
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
}
