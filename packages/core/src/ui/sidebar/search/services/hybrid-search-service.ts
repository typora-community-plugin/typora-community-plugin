import type { RipgrepSearchService, SearchOptions, SearchResult } from './text-search-service'
import { IndexSearchService } from './index-search-service'
import { astHasFieldNodes } from './query-parser'
import type { ParsedAST } from './query-parser'
import { astHasBodyNegation, astHasNegationUnderOr, collectNegationPatterns } from './query-parser/negation'

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
 *
 * Negation: `-word` excludes the whole file when the word occurs anywhere in
 * it. Because ripgrep only reports a sample of matching lines, that cannot be
 * decided from the text results; a dedicated `rg -l` scan per negated pattern
 * supplies whole-file facts, and results are only emitted once those facts are
 * ready.
 */
export class HybridSearchService {

  private _textSearcher: RipgrepSearchService
  private _indexSearcher = new IndexSearchService()
  /** Guards against a superseded run emitting results. */
  private _runToken = 0

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

    const token = ++this._runToken
    const { onResult, onComplete } = options ?? {}

    // Parse AST once per query
    const ast = this._indexSearcher.getAST(query)
    if (!ast) {
      // No structured tokens — pure text search, delegate to ripgrep directly
      this._textSearcher.execute(query, options)
      return
    }

    const textTokens = this._indexSearcher.extractTextTokenList(ast)
    const hasFieldNodes = astHasFieldNodes(ast)

    if (astHasBodyNegation(ast)) {
      this._executeFileScopedNegation(ast, textTokens, hasFieldNodes, token, options)
      return
    }

    // ── No body negation: match-scoped evaluation (historical behaviour) ──
    if (textTokens.length === 0) {
      // No text tokens — index-only search, scan metadata cache directly
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

  /**
   * Negation path: gather whole-file facts for every negated pattern, then
   * evaluate the AST in file scope and emit only the surviving files.
   */
  private _executeFileScopedNegation(
    ast: ParsedAST,
    textTokens: string[],
    hasFieldNodes: boolean,
    token: number,
    options?: SearchOptions,
  ): void {
    const { onResult, onComplete } = options ?? {}
    const universeMode = astHasNegationUnderOr(ast)

    // In universe mode the negated side can match files the positive text
    // search never returns, so every token (positive and negated) needs a
    // whole-file fact, and the result set is the metadata universe.
    const scannedPatterns = universeMode
      ? Array.from(new Set([...textTokens, ...collectNegationPatterns(ast)]))
      : collectNegationPatterns(ast)

    // Whole-file scans run in parallel with the body search.
    const factsPromise = this._textSearcher.listFilesContaining(scannedPatterns, options)

    const textResults: SearchResult[] = []
    const textDone = new Promise<void>(resolve => {
      if (textTokens.length === 0) {
        resolve()
        return
      }
      this._textSearcher.execute(textTokens, {
        ...options,
        onResult: (result) => { textResults.push(result) },
        onComplete: resolve,
      })
    })

    void Promise.all([factsPromise, textDone]).then(([facts]) => {
      if (token !== this._runToken) return

      if (facts.supported && !facts.ok) {
        // Fail closed: without whole-file facts the negation cannot be honoured.
        onComplete?.()
        return
      }

      // `undefined` on platforms without plugin-side scans (macOS): keep the
      // historical match-scoped behaviour instead of dropping everything.
      const filePatterns = facts.supported ? facts.files : undefined

      const results = this._indexSearcher.buildFinalResults(ast, textResults, filePatterns, {
        includeIndexOnly: hasFieldNodes || textTokens.length === 0,
        universe: universeMode,
      })
      for (const result of results) onResult?.(result)
      onComplete?.()
    })
  }

  /** Cancel any running search. */
  cancel(): void {
    this._runToken++
    this._textSearcher.cancel()
  }

}
