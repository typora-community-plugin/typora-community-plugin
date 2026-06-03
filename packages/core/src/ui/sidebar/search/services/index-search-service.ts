import { useService } from 'src/common/service'
import path from 'src/path'
import { tryParse, getHandler } from './query-parser'
import type { ParsedAST, FieldNode, EvalContext } from './query-parser'
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
        // Dispatch to the registered handler for text extraction
        const handler = getHandler(node.field)
        if (handler) {
          const text = handler.extractSearchText(node as FieldNode)
          if (text !== null) tokens.push(text)
        }
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

      // Build eval context with frontmatter only (no body tokens in index-only mode)
      const context: EvalContext = {
        bodyTokens: new Set(),
        frontmatter,
        tags: entry.metadata?.tags,
        titles: entry.metadata?.titles,
      }

      // Evaluate AST against frontmatter only
      if (!evaluateAST(ast, context)) {
        continue
      }

      // Collect field matches from frontmatter (with yaml positions for line numbers)
      const fieldMatches = collectFieldMatches(ast, context)

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
      entry.metadata?.titles,
    )

    return finalResult
  }
}
