import type { RipgrepSearchService, SearchResult } from './text-search-service'
import { IndexSearchService } from './index-search-service'
import type { ParsedAST } from './query-parser'

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
    const hasFieldNodes = this._astHasFieldNodes(ast)

    if (!ripgrepQuery.trim()) {
      // No text tokens — index-only search, scan metadata cache directly
      console.log('[HybridSearch] Index-only search (no text tokens), scanning metadata cache')
      this._indexSearcher.indexOnlySearch(ast, onResult)
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
    // For each file found by ripgrep, enrich with field matches from metadata.
    // Files already emitted by indexOnlySearch above get their body match
    // lines appended by the renderer's existing-item path.
    this._textSearcher.execute(ripgrepQuery, options, (textResult) => {
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

  /** Recursively check if AST contains any field nodes (tag:, title:, filename:). */
  private _astHasFieldNodes(ast: ParsedAST): boolean {
    if (ast.type === 'field') return true
    if (ast.type === 'and' || ast.type === 'or') {
      return ast.children.some(child => this._astHasFieldNodes(child))
    }
    if (ast.type === 'not') return this._astHasFieldNodes(ast.child)
    return false
  }
}
