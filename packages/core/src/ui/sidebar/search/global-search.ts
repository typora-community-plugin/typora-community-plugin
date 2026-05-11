import { editor } from "typora"
import { useService } from "src/common/service"
import { GlobalSearchView } from "./global-search-view"
import { RipgrepSearchService } from "./search-service"


export class GlobalSearch {

  private _searchService: RipgrepSearchService | null = null

  constructor(
    private workspace = useService('workspace'),
    private vault = useService('vault'),
  ) {
  }

  openGlobalSearch(query: string) {
    const { workspace, vault } = this

    // Open the search panel
    workspace.ribbon.clickButton(GlobalSearchView.id)
    const view = workspace.getViewByType(GlobalSearchView) as GlobalSearchView

    // Set query and start custom search
    view.setQuery(query)

    // Cancel any previous search
    this._searchService?.cancel()

    const caseSensitive = editor.library.fileSearch.caseSensitive ?? false
    const wholeWord = editor.library.fileSearch.wholeWord ?? false

    this._searchService = new RipgrepSearchService(
      vault.path,
      caseSensitive,
      wholeWord,
    )

    // Execute search and stream results
    this._searchService.execute(query, (result) => {
      view.renderResult(result)
    })
  }

  getGlobalSearchQuery() {
    const view = this.workspace.getViewByType(GlobalSearchView) as GlobalSearchView | undefined
    return view?.getQuery() ?? ""
  }
}
