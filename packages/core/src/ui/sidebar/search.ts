import decorate from '@plylrnsdy/decorate.js'
import { editor } from "typora"
import type { App } from 'src/app'
import { Component } from 'src/component'
import { View } from 'src/ui/view'
import type { Workspace } from "src/ui/workspace"
import { BUILT_IN } from "src/ui/ribbon/workspace-ribbon"
import { html } from "src/utils/html"
import { noop } from 'src/utils/noop'


export class GlobalSearch extends View {

  private get sidebar() {
    return this.app.workspace.sidebar
  }

  private _keepSearchResult: KeepSearchResult
  private _showSearchResultFullPath: ShowSearchResultFullPath

  constructor(private app: App, workspace: Workspace) {
    super()

    this.containerEl = document.getElementById('file-library-search') as HTMLElement

    workspace.ribbon.addButton({
      [BUILT_IN]: true,
      id: 'core.search',
      title: app.i18n.t.ribbon.search,
      icon: html`<i class="fa fa-search"></i>`,
      onclick: () => this.sidebar.switch(GlobalSearch),
    })

    this._keepSearchResult = new KeepSearchResult(app)
    this._showSearchResultFullPath = new ShowSearchResultFullPath(app)
  }

  show() {
    editor.library.fileSearch.show()
    this._keepSearchResult.showSearchPanel()
  }

  hide() {
    this.sidebar.wrapperEl.classList.remove('ty-show-search', 'ty-on-search')
  }

  openGlobalSearch(query: string) {
    this.sidebar.switch(GlobalSearch)
    $('#file-library-search-input').val(query)
    editor.library.fileSearch.search(query)
  }
}

class KeepSearchResult extends Component {

  private SETTING_KEY = 'keepSearchResult' as const

  constructor(private app: App) {
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
      this.app.workspace.sidebar.wrapperEl.classList.add('ty-on-search')
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
