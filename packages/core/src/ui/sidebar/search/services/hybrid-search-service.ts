import type { RipgrepSearchService, SearchResult } from './text-search-service'
import { IndexSearchService } from './index-search-service'

/**
 * Hybrid search service — combines ripgrep text search with IndexedDB metadata lookup.
 *
 * Flow:
 *   1. Parse query into AST (detects structured tokens like tag:/title:)
 *   2. If no structured tokens, delegate to raw RipgrepSearchService
 *   3. Otherwise: ripgrep scans → onResult callback → IndexedDB lookup → AST evaluate → emit filtered result
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
    options?: { caseSensitive?: boolean; wholeWord?: boolean },
    onResult?: (result: SearchResult) => void,
  ): void {

    // Parse AST once per query
    const ast = this._indexSearcher.getAST(query)
    if (!ast) {
      // No structured tokens — pure text search, delegate to ripgrep directly
      this._textSearcher.execute(query, options, onResult)
      return
    }

    // Structured query: ripgrep + IndexedDB enrichment
    const ripgrepQuery = this._indexSearcher.extractTextTokens(ast)

    if (!ripgrepQuery.trim()) {
      // No text tokens — index-only search, scan metadata cache directly
      console.log('[HybridSearch] Index-only search (no text tokens), scanning metadata cache')
      this._indexSearcher.indexOnlySearch(ast, onResult)
      return
    }

    this._textSearcher.execute(ripgrepQuery, options, (textResult) => {
      // Phase 2: Index Lookup — async, non-blocking (doesn't stall ripgrep)
      const finalResult = this._indexSearcher.buildResult(textResult, ast)
      if (finalResult && onResult) {
        onResult(finalResult)
      }
    })
  }

  /** Cancel any running search. */
  cancel(): void {
    this._textSearcher.cancel()
  }
}
