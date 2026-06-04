import type { RipgrepSearchService, SearchOptions, SearchResult } from './text-search-service'
import { IndexSearchService } from './index-search-service'
import { astHasFieldNodes } from './query-parser'

/**
 * Hybrid search service — combines ripgrep text search with IndexedDB metadata lookup.
 *
 * Flow:
 *   1. Parse query into AST (detects structured tokens like tag:/title:)
 *   2. If no structured tokens, delegate to raw RipgrepSearchService
 *   3. Otherwise:
 *      - ripgrep scans body text → onResult callback → IndexedDB lookup → AST evaluate → emit enriched result
 *      - If AST has field nodes (e.g. tag:), ALSO scan metadata cache for frontmatter-only matches
 *        that ripgrep wouldn't find (e.g. frontmatter tags with no inline #tag in body)
 */
export class HybridSearchService {

  private _textSearcher: RipgrepSearchService
  private _indexSearcher = new IndexSearchService()

  constructor(textSearcher: RipgrepSearchService) {
    this._textSearcher = textSearcher
  }

  /**
   * Execute hybrid search.
   * Delegates to ripgrep for pure text queries; enriches results with metadata for structured queries.
   */
  execute(
    query: string,
    options?: SearchOptions,
  ): void {

    const { onResult, onComplete } = options ?? {}

    // Parse AST once per query
    const ast = this._indexSearcher.getAST(query)
    if (!ast) {
      // No structured tokens — pure text search, delegate to ripgrep directly
      this._textSearcher.execute(query, options)
      return
    }

    // Structured query: ripgrep + IndexedDB enrichment
    const textTokens = this._indexSearcher.extractTextTokenList(ast)
    const hasFieldNodes = astHasFieldNodes(ast)

    if (textTokens.length === 0) {
      // No text tokens — index-only search, scan metadata cache directly
      console.log('[HybridSearch] Index-only search (no text tokens), scanning metadata cache')
      this._indexSearcher.indexOnlySearch(ast, onResult)
      onComplete?.()
      return
    }

    // ── Field nodes present: also scan metadata cache ────────────────────
    // Catch files whose frontmatter satisfies the field condition (e.g. tag:A)
    // but have no inline match in body text — ripgrep alone would miss these.
    // The renderer handles dedup gracefully: it appends lines when called
    // again for the same filePath (renderResult line 48-56).
    if (hasFieldNodes) {
      this._indexSearcher.indexOnlySearch(ast, onResult)
    }

    // ── Text search via ripgrep + metadata enrichment ────────────────────
    // Each text token is searched independently by ripgrep (OR semantics),
    // so a file with #foo on line 3 and Title on line 10 is still found.
    // The AST evaluation in buildResult then enforces AND semantics.
    // Files already emitted by indexOnlySearch above get their body match
    // lines appended by the renderer's existing-item path.
    this._textSearcher.execute(textTokens, {
      ...options,
      onResult: (textResult) => {
        const finalResult = this._indexSearcher.buildResult(textResult, ast)
        if (finalResult && onResult) {
          onResult(finalResult)
        }
      },
    })
  }

  /** Cancel any running search. */
  cancel(): void {
    this._textSearcher.cancel()
  }

}
