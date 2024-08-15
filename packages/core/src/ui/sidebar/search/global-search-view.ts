import decorate from '@plylrnsdy/decorate.js'
import { editor } from "typora"
import { Component } from 'src/common/component'
import { View } from 'src/ui/view'
import { BUILT_IN } from "src/ui/ribbon/workspace-ribbon"
import { html } from "src/utils/html"
import { noop } from 'src/utils/noop'
import { useService } from 'src/common/service'


const SELECTOR_QUERY_INPUT = '#file-library-search-input'

export class GlobalSearchView extends View {

  static get id() {
    return 'core.search' as const
  }

  private _keepSearchResult = new KeepSearchResult()
  private _showSearchResultFullPath = new ShowSearchResultFullPath()

  constructor(
    i18n = useService('i18n'),
    ribbon = useService('ribbon'),
    private sidebar = useService('sidebar'),
  ) {
    super()

    this.containerEl = document.getElementById('file-library-search') as HTMLElement

    ribbon.addButton({
      [BUILT_IN]: true,
      id: GlobalSearchView.id,
      title: i18n.t.ribbon.search,
      icon: html`<i class="fa fa-search"></i>`,
      onclick: () => sidebar.switch(GlobalSearchView),
    })
  }

  show() {
    editor.library.fileSearch.show()
    this._keepSearchResult.showSearchPanel()
  }

  hide() {
    this.sidebar.wrapperEl.classList.remove('ty-show-search', 'ty-on-search')
  }

  getQuery() {
    return $(SELECTOR_QUERY_INPUT).val() as string ?? ''
  }

  setQuery(query: string) {
    $(SELECTOR_QUERY_INPUT).val(query)
  }

  startSearch() {
    editor.library.fileSearch.search(this.getQuery())
  }
}

class KeepSearchResult extends Component {

  private SETTING_KEY = 'keepSearchResult' as const

  constructor(
    private settings = useService('settings'),
    private sidebar = useService('sidebar'),
  ) {
    super()

    const { SETTING_KEY } = this

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    this.register(
      decorate(editor.library.fileSearch, 'clearSearch', () => noop)
    )
  }

  showSearchPanel() {
    if (this.settings.get(this.SETTING_KEY))
      this.sidebar.wrapperEl.classList.add('ty-on-search')
  }
}

class ShowSearchResultFullPath extends Component {

  private observer = new MutationObserver(this.appendTitle)

  constructor(
    settings = useService('settings'),
  ) {
    super()

    const SETTING_KEY = 'showSearchResultFullPath'

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
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
