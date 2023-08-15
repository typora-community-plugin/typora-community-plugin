import { View } from 'src/ui/view'
import type { Workspace } from "src/ui/workspace"
import type { Sidebar } from './sidebar'
import { BUILT_IN, WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import { editor } from "typora"
import { html } from "src/utils/html"
import type { App } from 'src/app'
import { Component } from 'src/component'


export class Search extends View {

  private _showSearchResultFullPath: ShowSearchResultFullPath

  constructor(app: App, workspace: Workspace, sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('file-library-search') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      title: app.i18n.t.ribbon.search,
      icon: html`<i class="fa fa-search"></i>`,
      onclick: () => sidebar.switch(Search),
    })

    this._showSearchResultFullPath = new ShowSearchResultFullPath(app)
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

class ShowSearchResultFullPath extends Component {

  private observer = new MutationObserver(this.appendTitle)

  constructor(app: App) {
    super()

    const SETTING_KEY = 'showSearchResultFullPath'

    if (app.settings.get(SETTING_KEY)) {
      this.load()
    }

    app.settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  private appendTitle(mutationsList: MutationRecord[]) {
    mutationsList.forEach(mutation => {
      if (mutation.type !== 'childList') return
      mutation.addedNodes.forEach((el: HTMLElement) => {
        const loc = el.querySelector('.file-list-item-parent-loc')! as HTMLElement
        loc.title = loc.innerText
      })
    })
  }

  onload() {
    const resultsEl = $('#file-library-search-result').get(0)!
    this.observer.observe(resultsEl, {
      attributes: false,
      childList: true,
      subtree: true,
    })
  }

  onunload() {
    this.observer.disconnect()
  }
}
