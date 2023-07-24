import { View } from 'src/ui/view'
import type { Workspace } from "src/ui/workspace"
import type { Sidebar } from './sidebar'
import { BUILT_IN, WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import { editor } from "typora"
import { html } from "src/utils/html"
import type { App } from 'src/app'


export class Search extends View {

  constructor(app: App, workspace: Workspace, sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('file-library-search') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      title: app.i18n.t.ribbon.search,
      icon: html`<i class="fa fa-search"></i>`,
      onclick: () => sidebar.switch(Search),
    })
  }

  onload() {
  }

  onunload() {
  }

  show() {
    editor.library.fileSearch.showSearch()
  }

  hide() {
    const parent = this.containerEl.parentElement!
    parent.classList.remove('ty-show-search')
    parent.classList.remove('ty-on-search')
  }
}
