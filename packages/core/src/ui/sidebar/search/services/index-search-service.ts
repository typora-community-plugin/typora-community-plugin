import { useService } from 'src/common/service'
import path from 'src/path'
import { tryParse, getHandler } from './query-parser'
import type { ParsedAST, FieldNode, EvalContext } from './query-parser'
import { evaluateAST, collectFieldMatches, buildSearchResult } from './eval/result-builder'
import { astHasNegatedTerm } from './query-parser/negation'
import { isMarkdownFile } from './scan/negation-scan'
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

  /** Collect text tokens from AST for ripgrep search. */
  extractTextTokens(ast: ParsedAST): string {
    return this.extractTextTokenList(ast).join(' ')
  }

  /**
   * Extract individual text tokens from AST.
   * Unlike extractTextTokens (which joins everything), this returns the raw
   * array so ripgrep can search each token independently with -e flags.
   * This is critical for AND queries like `tag:foo Title` — without it,
   * ripgrep treats "#foo Title" as a single literal phrase, missing files
   * where #foo and Title are on different lines.
   */
  extractTextTokenList(ast: ParsedAST): string[] {
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
        const handler = getHandler(node.field)
        if (handler) {
          const text = handler.extractSearchText(node as FieldNode)
          if (text !== null) tokens.push(text)
        }
      } else if (node.type === 'term') {
        tokens.push(node.pattern)
      }
    }

    visit(ast)
    return tokens
  }

  /**
   * Index-only search: scan metadata cache when no text tokens to search with ripgrep.
   */
  indexOnlySearch(
    ast: ParsedAST,
    onResult?: (result: SearchResult) => void,
  ): void {
    for (const result of this.collectIndexOnlyResults(ast)) {
      onResult?.(result)
    }
  }

  /**
   * Collect results that can be answered from metadata alone.
   *
   * @param filePatterns Whole-file negation facts, keyed by absolute path.
   *   When provided, the AST is evaluated in file scope: a negated body term
   *   excludes the file if the term occurs anywhere in it. Files with no body
   *   text (images etc.) are skipped when the query needs body evidence,
   *   because "does not contain the word" is meaningless for them.
   */
  collectIndexOnlyResults(
    ast: ParsedAST,
    filePatterns?: Map<string, Set<string>>,
  ): SearchResult[] {
    const results: SearchResult[] = []
    const needsBody = filePatterns !== undefined && astHasNegatedTerm(ast)

    for (const [relPath, entry] of Object.entries(this._metadata.cache)) {
      const absPath = path.isAbsolute(relPath) ? relPath : path.join(this._vault.path, relPath)

      if (needsBody && !isMarkdownFile(absPath)) continue

      const frontmatter = entry.metadata?.frontmatter ?? {}

      // Build eval context with frontmatter only (no body tokens in index-only mode)
      const context: EvalContext = {
        bodyTokens: new Set(),
        frontmatter,
        tags: entry.metadata?.tags,
        titles: entry.metadata?.titles,
        filePath: relPath,
      }
      if (filePatterns) {
        context.scope = 'file'
        context.filePatterns = filePatterns.get(absPath) ?? new Set()
      }

      // Evaluate AST against frontmatter + file path (+ whole-file facts)
      if (!evaluateAST(ast, context)) {
        continue
      }

      // Collect field matches from frontmatter + file path
      const fieldMatches = collectFieldMatches(ast, context)

      results.push({
        filePath: absPath,
        matches: fieldMatches,
        totalMatches: fieldMatches.length,
      })
    }

    return results
  }

  /**
   * Assemble the final, ordered result list for a query.
   *
   * Order matters: the renderer appends body lines to an existing item and
   * skips `field:*` lines otherwise, so metadata-only results must come first.
   *
   * @param filePatterns Whole-file negation facts (absolute path → patterns).
   * @param options.includeIndexOnly Emit metadata-only results before body results.
   * @param options.universe Enumerate the metadata universe (OR-with-negation):
   *   such queries can match files the positive text search never returns.
   */
  buildFinalResults(
    ast: ParsedAST,
    textResults: SearchResult[],
    filePatterns: Map<string, Set<string>> | undefined,
    options: { includeIndexOnly: boolean; universe?: boolean },
  ): SearchResult[] {
    if (options.universe) {
      return this._mergeUniverseResults(ast, textResults, filePatterns)
    }

    const results: SearchResult[] = []
    if (options.includeIndexOnly) {
      results.push(...this.collectIndexOnlyResults(ast, filePatterns))
    }
    for (const textResult of textResults) {
      const finalResult = this.buildResult(textResult, ast, filePatterns?.get(textResult.filePath))
      if (finalResult) results.push(finalResult)
    }
    return results
  }

  /**
   * Universe merge: every file is judged by whole-file facts, and body lines
   * found by the positive search are attached when available.
   */
  private _mergeUniverseResults(
    ast: ParsedAST,
    textResults: SearchResult[],
    filePatterns: Map<string, Set<string>> | undefined,
  ): SearchResult[] {
    const results: SearchResult[] = []
    const textByPath = new Map(textResults.map(result => [result.filePath, result]))
    const emitted = new Set<string>()

    for (const universeResult of this.collectIndexOnlyResults(ast, filePatterns)) {
      const textResult = textByPath.get(universeResult.filePath)
      const finalResult = textResult
        ? this.buildResult(textResult, ast, filePatterns?.get(universeResult.filePath))
        : universeResult
      if (!finalResult) continue
      results.push(finalResult)
      emitted.add(universeResult.filePath)
    }

    // Text hits outside the metadata universe cannot be evaluated reliably;
    // emit whatever survives so behaviour matches the non-universe path.
    for (const textResult of textResults) {
      if (emitted.has(textResult.filePath)) continue
      const finalResult = this.buildResult(textResult, ast, filePatterns?.get(textResult.filePath))
      if (finalResult) results.push(finalResult)
    }

    return results
  }

  /**
   * Build a final search result by combining text search output with metadata enrichment.
   */
  buildResult(
    textResult: SearchResult,
    ast: ParsedAST,
    filePatterns?: Set<string>,
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
      filePatterns,
    )

    return finalResult
  }
}
