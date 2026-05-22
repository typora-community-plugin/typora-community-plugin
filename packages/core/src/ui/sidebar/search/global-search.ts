import { editor } from "typora"
import { useService } from "src/common/service"
import { GlobalSearchView } from "./global-search-view"
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

    // Route: structured query → hybrid search, pure text → ripgrep directly
    const hasStructuredTokens = this._hasStructuredTokens(query)

    if (hasStructuredTokens) {
      this._hybridSearch.execute(query, { caseSensitive, wholeWord }, (result) => {
        view.renderer.renderResult(result)
      })
    } else {
      this._searchService?.execute(query, { caseSensitive, wholeWord }, (result) => {
        view.renderer.renderResult(result)
      })
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

    // Match tag:/title:/filename: prefixes (case-insensitive)
    if (/^(tag|title|filename):/i.test(trimmed)) return true
    if (/\s(tag|title|filename):/i.test(trimmed)) return true

    // Check for quoted phrases
    if (trimmed.includes('"')) return true

    return false
  }
}
