import { View } from 'src/ui/view'
import type { Workspace } from "src/ui/workspace"
import type { Sidebar } from './sidebar'
import { BUILT_IN, WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import { editor } from "typora"
import { html } from "src/utils/html"
import type { App } from 'src/app'


export class Outline extends View {

  constructor(app: App, workspace: Workspace, sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('outline-content') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      id: 'core.outline',
      title: app.i18n.t.ribbon.outline,
      icon: html`<i class="fa fa-list"></i>`,
      onclick: () => sidebar.switch(Outline),
    })
  }

  onunload() {
    this.containerEl.style.display = ''
  }

  show() {
    editor.library.switch("outline")
    super.show()
  }

  hide() {
    this.containerEl.parentElement!.classList.remove('active-tab-outline')
    super.hide()
  }

}
