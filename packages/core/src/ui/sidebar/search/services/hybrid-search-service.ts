import { useService } from 'src/common/service'
import type { RipgrepSearchService, SearchResult } from './text-search-service'
import { tryParse, type ParsedAST } from './query-parser'
import { buildSearchResult, evaluateAST, collectFieldMatches } from './result-builder'

/**
 * Hybrid search service — combines ripgrep text search with IndexedDB metadata lookup.
 *
 * Flow:
 *   1. Parse query into AST (detects structured tokens like tag:/title:)
 *   2. If no structured tokens, delegate to raw RipgrepSearchService
 *   3. Otherwise: ripgrep scans → onResult callback → IndexedDB lookup → AST evaluate → emit filtered result
 */
export class HybridSearchService {

  private _textSearch: RipgrepSearchService
  private _metadata = useService('metadata-manager')
  private _astCache = new Map<string, ParsedAST>()

  constructor(textSearch: RipgrepSearchService) {
    this._textSearch = textSearch
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
    const ast = this._getAST(query)
    if (!ast) {
      // No structured tokens — pure text search, delegate to ripgrep directly
      this._textSearch.execute(query, options, onResult)
      return
    }

    // Structured query: ripgrep + IndexedDB enrichment
    const ripgrepQuery = this._extractTextTokens(ast)

    if (!ripgrepQuery.trim()) {
      // No text tokens — index-only search, scan metadata cache directly
      console.log('[HybridSearch] Index-only search (no text tokens), scanning metadata cache')
      this._indexOnlySearch(ast, onResult)
      return
    }

    this._textSearch.execute(ripgrepQuery, options, (textResult) => {
      // Phase 2: Index Lookup — async, non-blocking (doesn't stall ripgrep)
      const entry = this._metadata.get(textResult.filePath)
      if (!entry) return

      // Phase 3: AST evaluate + result build
      const finalResult = buildSearchResult(
        textResult,
        entry.metadata?.frontmatter ?? {},
        ast,
      )

      if (finalResult && onResult) {
        onResult(finalResult)
      }
    })
  }

  /** Cancel any running search. */
  cancel(): void {
    this._textSearch.cancel()
  }

  /** Index-only search: scan metadata cache when no text tokens to search with ripgrep. */
  private _indexOnlySearch(ast: ParsedAST, onResult?: (result: SearchResult) => void): void {
    const entries = Object.entries(this._metadata.cache)

    for (const [filePath, entry] of entries) {
      const frontmatter = entry.metadata?.frontmatter ?? {}

      // Evaluate AST against frontmatter only
      if (!evaluateAST(ast, new Set(), frontmatter)) {
        continue
      }

      // Collect field matches from frontmatter
      const fieldMatches = collectFieldMatches(ast, frontmatter)

      if (fieldMatches.length > 0 && onResult) {
        console.log('[HybridSearch] Index-only match:', filePath, 'matches:', fieldMatches.length)
        onResult({
          filePath,
          matches: fieldMatches,
          totalMatches: fieldMatches.length,
        })
      }
    }
  }

  private _getAST(query: string): ParsedAST | null {
    const cached = this._astCache.get(query)
    if (cached) return cached

    const ast = tryParse(query)
    if (ast) {
      this._astCache.set(query, ast)
    }
    return ast
  }

  /** Extract body keywords from AST for ripgrep search. */
  private _extractTextTokens(ast: ParsedAST): string {
    const tokens: string[] = []

    const visit = (node: ParsedAST) => {
      if (node.type === 'and' || node.type === 'or') {
        for (const child of node.children) {
          visit(child)
        }
      } else if (node.type === 'not') {
        // Negated fields don't contribute search tokens to ripgrep
        // (they're handled by AST evaluation in Phase 3)
      } else if (node.type === 'field') {
        // Field tokens (tag:, title:) are frontmatter-only, skip for ripgrep
      } else if (node.type === 'term') {
        // Bare words and quoted phrases go to ripgrep
        tokens.push(node.pattern)
      }
    }

    visit(ast)
    return tokens.join(' ')
  }
}
