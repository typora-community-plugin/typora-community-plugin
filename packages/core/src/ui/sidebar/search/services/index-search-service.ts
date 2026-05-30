import { useService } from 'src/common/service'
import path from 'src/path'
import type { ParsedAST } from './query-parser'
import { tryParse } from './query-parser'
import { evaluateAST, collectFieldMatches, buildSearchResult } from './result-builder'
import type { SearchResult } from './text-search-service'

/**
 * Index search service — handles IndexedDB metadata cache scanning and AST-based query parsing.
 *
 * Responsibilities:
 *   1. Parse queries into AST (with caching)
 *   2. Extract text tokens from AST for ripgrep delegation
 *   3. Scan metadata cache for index-only structured queries
 */
export class IndexSearchService {

  private _metadata = useService('metadata-manager')
  private _vault = useService('vault')
  private _astCache = new Map<string, ParsedAST>()

  /** Parse and cache a query into an AST. Returns null if no structured tokens found. */
  getAST(query: string): ParsedAST | null {
    const cached = this._astCache.get(query)
    if (cached) return cached

    const ast = tryParse(query)
    if (ast) {
      this._astCache.set(query, ast)
    }
    return ast
  }

  /** Extract body keywords from AST for ripgrep search. */
  extractTextTokens(ast: ParsedAST): string {
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
        // Tag fields also match inline tags in body text (#A), emit #pattern for ripgrep
        if (node.field === 'tag') {
          tokens.push(`#${node.pattern}`)
        }
        // title/filename are frontmatter-only, skip for ripgrep
      } else if (node.type === 'term') {
        // Bare words and quoted phrases go to ripgrep
        tokens.push(node.pattern)
      }
    }

    visit(ast)
    return tokens.join(' ')
  }

  /**
   * Index-only search: scan metadata cache when no text tokens to search with ripgrep.
   */
  indexOnlySearch(
    ast: ParsedAST,
    onResult?: (result: SearchResult) => void,
  ): void {
    const entries = Object.entries(this._metadata.cache)

    for (const [relPath, entry] of entries) {
      const frontmatter = entry.metadata?.frontmatter ?? {}

      // Evaluate AST against frontmatter only
      if (!evaluateAST(ast, new Set(), frontmatter)) {
        continue
      }

      // Collect field matches from frontmatter (with yaml positions for line numbers)
      const fieldMatches = collectFieldMatches(ast, frontmatter, entry.metadata?.tags)

      if (fieldMatches.length > 0 && onResult) {
        // Convert relative cache key to absolute path so Typora can open the file
        const absPath = path.isAbsolute(relPath) ? relPath : path.join(this._vault.path, relPath)
        console.log('[IndexSearch] Index-only match:', absPath, 'matches:', fieldMatches.length)
        onResult({
          filePath: absPath,
          matches: fieldMatches,
          totalMatches: fieldMatches.length,
        })
      }
    }
  }

  /**
   * Build a final search result by combining text search output with metadata enrichment.
   */
  buildResult(
    textResult: SearchResult,
    ast: ParsedAST,
  ): SearchResult | null {
    // Metadata cache is keyed by relative path; convert absolute filePath back to relative for lookup
    const relPath = path.isAbsolute(textResult.filePath)
      ? path.relative(this._vault.path, textResult.filePath)
      : textResult.filePath

    const entry = this._metadata.get(relPath)
    if (!entry) return null

    const finalResult = buildSearchResult(
      textResult,
      entry.metadata?.frontmatter ?? {},
      ast,
      entry.metadata?.tags,
    )

    return finalResult
  }
}
