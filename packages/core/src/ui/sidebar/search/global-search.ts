import { editor } from "typora"
import { useService } from "src/common/service"
import { GlobalSearchView } from "./global-search-view"
import { RipgrepSearchService } from "./search-service"


export class GlobalSearch {

  private _searchService!: RipgrepSearchService

  constructor(
    private workspace = useService('workspace'),
    private vault = useService('vault'),
  ) {
    this._searchService = new RipgrepSearchService(vault.path)
    vault.on('change', (vaultPath) => {
      this._searchService = new RipgrepSearchService(vaultPath)
    })
  }

  openGlobalSearch(query: string) {
    const { workspace, vault } = this

    const isActive = $('#typora-sidebar').hasClass('ty-show-search')
    if (!isActive) {
      // Open the search panel
      workspace.ribbon.clickButton(GlobalSearchView.id)
    }

    const view = workspace.getViewByType(GlobalSearchView) as GlobalSearchView

    view.setQuery(query)

    const caseSensitive = editor.library.fileSearch.caseSensitive ?? false
    const wholeWord = editor.library.fileSearch.wholeWord ?? false

    this._searchService?.cancel()
    this._searchService.execute(query, { caseSensitive, wholeWord }, (result) => {
      view.renderer.renderResult(result)
    })
  }

  getGlobalSearchQuery() {
    const view = this.workspace.getViewByType(GlobalSearchView) as GlobalSearchView | undefined
    return view?.getQuery() ?? ""
  }
}
