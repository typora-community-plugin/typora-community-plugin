import { editor } from "typora"
import { useService } from "src/common/service"
import { GlobalSearchView } from "./views/global-search-view"
import { RipgrepSearchService } from "./services/text-search-service"
import { HybridSearchService } from "./services/hybrid-search-service"


export class GlobalSearch {

  private _searchService!: RipgrepSearchService
  private _hybridSearch!: HybridSearchService

  constructor(
    private workspace = useService('workspace'),
    private vault = useService('vault'),
  ) {
    this._searchService = new RipgrepSearchService(vault.path)
    this._hybridSearch = new HybridSearchService(this._searchService)
    vault.on('change', (vaultPath) => {
      this._searchService = new RipgrepSearchService(vaultPath)
      this._hybridSearch = new HybridSearchService(this._searchService)
    })
  }

  openGlobalSearch(query: string) {
    const { workspace } = this
    workspace.ribbon.clickButton(GlobalSearchView.id)

    const view = workspace.getViewByType(GlobalSearchView)!
    view.setQuery(query)
    editor.library.fileSearch.search(query)
  }

  /**
   * Open the global search panel and execute a search with the given query.
   *
   * The query is always dispatched through HybridSearchService, which parses
   * it into an AST. Structured tokens (tag:/title:/filename:) and multiple
   * bare words produce an AND tree; pure single-word queries fall through to
   * ripgrep directly.
   *
   * @param query - The search string entered by the user. May contain field
   *                prefixes (`tag:`, `title:`, `filename:`) and/or bare words.
   */
  openAdvancedSearch(query: string) {
    const { workspace } = this

    const isActive = $('#typora-sidebar').hasClass('ty-show-search')
    if (!isActive) {
      // Open the search panel
      workspace.ribbon.clickButton(GlobalSearchView.id)
    }

    const view = workspace.getViewByType(GlobalSearchView)!

    view.setQuery(query)

    // Clear previous search results before starting a new search
    view.renderer.clearResults()
    view.progressBar.show()

    const caseSensitive = editor.library.fileSearch.caseSensitive ?? false
    const wholeWord = editor.library.fileSearch.wholeWord ?? false

    this._searchService.cancel()

    this._hybridSearch.execute(query, {
      caseSensitive,
      wholeWord,
      onResult: (result) => view.renderer.renderResult(result),
      onComplete: () => view.renderer.onDrain(() => view.progressBar.hide()),
    })
  }

  getGlobalSearchQuery() {
    const view = this.workspace.getViewByType(GlobalSearchView) as GlobalSearchView | undefined
    return view?.getQuery() ?? ""
  }
}
