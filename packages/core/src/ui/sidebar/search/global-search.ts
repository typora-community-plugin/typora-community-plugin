import { useService } from "src/common/service"
import { editor } from "typora"
import { HybridSearchService } from "./services/hybrid-search-service"
import { RipgrepSearchService } from "./services/text-search-service"
import { GlobalSearchView } from "./views/global-search-view"


const ORIGINAL_KEY = Symbol.for('search$original')


export class GlobalSearch {

  private _searchService!: RipgrepSearchService
  private _hybridSearch!: HybridSearchService

  constructor(
    private workspace = useService('workspace'),
    // biome-ignore lint/correctness/noUnusedPrivateClassMembers: kept as a parameter property for the search service injection signature
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

    // Bypass AdvancedSearchMode's decoration on fileSearch.search so this
    // method always invokes Typora's native search regardless of the setting.
    const originalSearch = (editor.library.fileSearch as any)[ORIGINAL_KEY] ?? editor.library.fileSearch.search
    originalSearch.call(editor.library.fileSearch, query)
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

    // The panel may have been opened through Typora's native search button,
    // in which case `GlobalSearchView.onshow()` never ran. Ensure the CSS
    // class that reveals the result panel is present without toggling the
    // sidebar off.
    $('#typora-sidebar').addClass('ty-on-search')

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

  /**
   * Stop the running advanced search and clear the rendered results.
   *
   * Used when advanced mode is toggled off: without this, results rendered by
   * the custom engine stay in `#file-library-search-result` and a subsequent
   * native search that finds nothing leaves them visible as stale hits.
   */
  cancelSearch() {
    this._hybridSearch.cancel()

    const view = this.workspace.getViewByType(GlobalSearchView) as GlobalSearchView | undefined
    if (!view) return
    view.renderer.clearResults()
    view.progressBar.hide()
  }

  getGlobalSearchQuery() {
    const view = this.workspace.getViewByType(GlobalSearchView) as GlobalSearchView | undefined
    return view?.getQuery() ?? ""
  }
}
