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

  /**
   * Open the global search panel and execute a search with the given query.
   *
   * Behavior:
   * 1. Activate the search sidebar if it isn't already visible.
   * 2. Set the query string on the GlobalSearchView.
   * 3. Clear any previous results, then dispatch the search to the appropriate engine:
   *    - Structured queries (e.g. `tag:foo`, `title:"bar"`, quoted phrases) → HybridSearchService
   *    - Plain text queries → RipgrepSearchService directly
   *
   * @param query - The search string entered by the user. May contain field prefixes
   *                (`tag:`, `title:`, `filename:`) or double-quoted substrings to trigger
   *                hybrid (structured + full-text) search routing.
   */
  openGlobalSearch(query: string) {
    const { workspace, vault } = this

    const isActive = $('#typora-sidebar').hasClass('ty-show-search')
    if (!isActive) {
      // Open the search panel
      workspace.ribbon.clickButton(GlobalSearchView.id)
    }

    const view = workspace.getViewByType(GlobalSearchView) as GlobalSearchView

    view.setQuery(query)

    // Clear previous search results before starting a new search
    view.renderer.clearResults()
    view.progressBar.show()

    const caseSensitive = editor.library.fileSearch.caseSensitive ?? false
    const wholeWord = editor.library.fileSearch.wholeWord ?? false

    this._searchService?.cancel()

    const onComplete = () => view.renderer.onDrain(() => view.progressBar.hide())

    // Route: structured query → hybrid search, pure text → ripgrep directly
    const hasStructuredTokens = this._hasStructuredTokens(query)

    if (hasStructuredTokens) {
      this._hybridSearch.execute(query, { caseSensitive, wholeWord }, (result) => {
        view.renderer.renderResult(result)
      }, onComplete)
    } else {
      this._searchService?.execute(query, { caseSensitive, wholeWord }, (result) => {
        view.renderer.renderResult(result)
      }, onComplete)
    }
  }

  getGlobalSearchQuery() {
    const view = this.workspace.getViewByType(GlobalSearchView) as GlobalSearchView | undefined
    return view?.getQuery() ?? ""
  }

  private _hasStructuredTokens(query: string): boolean {
    // Check for field prefixes or quoted phrases
    const trimmed = query.trim()
    if (!trimmed) return false

    // Match tag:/title:/filename: prefixes, optionally negated (case-insensitive)
    // e.g. "tag:foo", "-tag:foo", "hello -tag:foo"
    if (/^-?(tag|title|filename):/i.test(trimmed)) return true
    if (/\s-?(tag|title|filename):/i.test(trimmed)) return true

    // Check for quoted phrases
    if (trimmed.includes('"')) return true

    return false
  }
}
