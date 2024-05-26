import decorate from '@plylrnsdy/decorate.js'
import { editor } from "typora"
import type { App } from 'src/app'
import { Component } from 'src/component'
import { View } from 'src/ui/view'
import type { Workspace } from "src/ui/workspace"
import { BUILT_IN, WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import type { Sidebar } from './sidebar'
import { html } from "src/utils/html"
import { noop } from 'src/utils/noop'


export class Search extends View {

  private _keepSearchResult: KeepSearchResult
  private _showSearchResultFullPath: ShowSearchResultFullPath

  constructor(app: App, workspace: Workspace, private sidebar: Sidebar) {
    super()

    this.containerEl = document.getElementById('file-library-search') as HTMLElement

    workspace.getViewByType(WorkspaceRibbon)!.addButton({
      [BUILT_IN]: true,
      id: 'core.search',
      title: app.i18n.t.ribbon.search,
      icon: html`<i class="fa fa-search"></i>`,
      onclick: () => sidebar.switch(Search),
    })

    this._keepSearchResult = new KeepSearchResult(app, this.sidebar)
    this._showSearchResultFullPath = new ShowSearchResultFullPath(app)
  }

  show() {
    editor.library.fileSearch.show()
    this._keepSearchResult.showSearchPanel()
  }

  hide() {
    this.sidebar.wrapperEl.classList.remove('ty-show-search', 'ty-on-search')
  }
}

class KeepSearchResult extends Component {

  private SETTING_KEY = 'keepSearchResult' as const

  constructor(private app: App, private sidebar: Sidebar) {
    super()

    if (app.settings.get(this.SETTING_KEY)) {
      this.load()
    }

    app.settings.onChange(this.SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    this.register(
      decorate(editor.library.fileSearch, 'clearSearch', () => noop)
    )
  }

  showSearchPanel() {
    if (this.app.settings.get(this.SETTING_KEY))
      this.sidebar.wrapperEl.classList.add('ty-on-search')
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
        const loc = el.querySelector('.file-list-item-parent-loc') as HTMLElement | null

        // NOTE: Files in root not has `loc` element
        if (!loc) return

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
