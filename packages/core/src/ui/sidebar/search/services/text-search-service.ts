import { bridge } from "typora"
import { Semaphore } from "src/utils/schedule/semaphore"
import { noop } from "src/utils"
import { buildFilesWithMatchesArgs } from "./scan/negation-scan"
import { isNativeBridgePlatform, resolveRipgrepPath, toAbsolutePath } from "./scan/rg-platform"
import { RipgrepProcessManager } from "./scan/ripgrep-process"
import type { TextRunHandle } from "./scan/ripgrep-process"
import { JsonLinesParser, matchPathOf, toSearchMatch } from "./scan/json-lines"
import type { SearchMatch } from "./scan/json-lines"

export type { MatchSource, SearchMatch } from "./scan/json-lines"


/** Max number of concurrent whole-file negation scans. */
const NEGATION_SCAN_CONCURRENCY = 4

/** Options for {@link RipgrepSearchService.execute}. */
export interface SearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  onResult?: (result: SearchResult) => void
  onComplete?: () => void
}

/**
 * Whole-file presence facts produced by {@link RipgrepSearchService.listFilesContaining}.
 */
export interface WholeFileFacts {
  /** False on platforms where a plugin-side scan is impossible (macOS). */
  supported: boolean
  /** False when at least one scan failed; callers should fail closed. */
  ok: boolean
  /** Absolute file path → set of query patterns occurring anywhere in that file. */
  files: Map<string, Set<string>>
}

/**
 * A file found by global search, with its matches.
 */
export interface SearchResult {
  /** Absolute file path */
  filePath: string
  /** Matches within this file (empty for filename-only results) */
  matches: SearchMatch[]
  /** Total match count for this file */
  totalMatches: number
}


/**
 * Custom ripgrep-based global search service.
 *
 * Architecture mirrors Typora's native `editor.libaray.fileSearch` (frame.js line ~13971):
 * - Windows/Linux: spawns 3 parallel `vscode-ripgrep` processes via child_process.spawn()
 *   1. Content match: rg --json -F -n -m 10 -g "!.*" <query> (file content, max 10 matches/file)
 *   2. Filename fuzzy: rg -m 2 ".*" -H -U --json <query> (filename fuzzy match, top 2 files)
 *   3. File list: rg --max-filesize 0K --files --iglob "*<query>*" (all matching file paths)
 * - macOS: delegates to bridge.callHandler("library.search", ...) native handler
 *
 * This class only orchestrates: process spawning/tracking lives in
 * `scan/ripgrep-process`, platform path handling in `scan/rg-platform`, and
 * JSON-lines parsing in `scan/json-lines`.
 *
 * Results are streamed via JSON Lines from ripgrep stdout, parsed incrementally,
 * and rendered into the existing Typora DOM structure (#file-library-search-result).
 */
export class RipgrepSearchService {

  private _processes = new RipgrepProcessManager()
  /** Streaming JSON-lines parsers for task1 (content) and task2 (pathMatch=true). */
  private _contentParser = new JsonLinesParser()
  private _pathParser = new JsonLinesParser()

  /** Accumulates results by file path so we emit complete SearchResult objects.
   *
   * Typora's native implementation (frame.js ~14236-14379) uses an accumulator pattern:
   * `begin` creates { path, matches: [] }, `match` pushes into it, `end` renders the
   * complete accumulated result. Our custom service must do the same — emit one
   * SearchResult per file with ALL its matches, not one SearchResult per match event.
   *
   * We accumulate across all 3 tasks and only flush after ALL close, so that a file
   * appearing in both Task 1 (content) and Task 2/3 (filename-only) gets merged into
   * ONE complete SearchResult instead of creating duplicate DOM entries.
   */
  private _resultsByPath = new Map<string, SearchResult>()

  constructor(
    private mountFolder: string,
  ) {}

  /** Kill all running ripgrep processes. Call before starting a new search. */
  cancel(): void {
    this._processes.cancelAll()
    this._resetRunState()
  }

  /**
   * Execute global search. On Windows/Linux, spawns 3 parallel ripgrep processes.
   * On macOS, delegates to native bridge handler.
   *
   * @param query - Single string (searched as-is) or string[] (each token passed
   *                as separate `-e` flag, OR semantics — AST evaluates AND later).
   */
  execute(
    query: string | string[],
    options?: SearchOptions,
  ): void {
    const caseSensitive = options?.caseSensitive ?? false
    const wholeWord = options?.wholeWord ?? false
    const { onResult, onComplete } = options ?? {}

    // Kills the previous text run and opens a new generation; flushes when all
    // tasks of this run have settled. Negation scans stay alive.
    const run = this._processes.beginTextRun(() => this._flushResults(onResult, onComplete))
    this._resetRunState()

    if (isNativeBridgePlatform()) {
      this._executeOnMac(query, caseSensitive, wholeWord, onResult)
      onComplete?.()
    } else {
      this._executeOnNode(run, query, caseSensitive, wholeWord, onResult, onComplete)
    }
  }

  /**
   * Execute global search on macOS.
   */
  private _executeOnMac(
    query: string | string[],
    caseSensitive = false,
    wholeWord = false,
    onResult?: (result: SearchResult) => void,
  ): void {
    // macOS: use bridge.callHandler("library.search", ...) which invokes native ripgrep
    const queryStr = typeof query === 'string' ? query : query.join(' ')

    bridge.callHandler("library.search", {
      text: queryStr,
      caseSensitive,
      wholeWord,
      args: this._buildRpArgs(query, caseSensitive, wholeWord),
    }, noop)
  }

  private _executeOnNode(
    run: TextRunHandle,
    query: string | string[],
    caseSensitive: boolean,
    wholeWord: boolean,
    onResult: (result: SearchResult) => void = noop,
    onComplete?: () => void,
  ): void {
    const rg = resolveRipgrepPath()
    if (!rg) {
      onComplete?.()
      return
    }

    const cwd = this.mountFolder

    // ── Task 1: Content match (file content search) ──────────────────────
    // Each pattern is passed as separate -e flag (OR semantics). The AST
    // evaluation in buildResult later enforces AND across all conditions.
    const task1 = run.track(run.spawn(rg, this._buildRpArgs(query, caseSensitive, wholeWord), cwd))

    task1.stdout?.on("data", (chunk: string) => {
      this._accumulateContentMatches(chunk)
    })
    task1.stderr?.on("data", () => {
      // Silently ignore stderr (ripgrep warnings about permission denied, etc.)
    })

    // ── Task 2: Filename fuzzy match (top 2 files by filename) ───────────
    // rg -m 2 --max-filesize 2M ".*" -H -U --json --no-messages [--iglob/-i] <query>
    // Task 2 & 3 use query as a glob pattern — always a single string.
    const queryStr = typeof query === 'string' ? query : query.join(' ')
    const escapedQuery = this._escapeRegExp(queryStr)
    const task2Args: string[] = [
      "-m", "2",
      "--max-filesize", "2M",
      ".*",
      "-H", "-U",
      "--json",
      "--no-messages",
      caseSensitive ? "-g" : "--iglob",
      `*${escapedQuery}*`,
    ]
    const task2 = run.track(run.spawn(rg, task2Args, cwd))

    task2.stdout?.on("data", (chunk: string) => {
      // pathMatch=true: accumulated into _resultsByPath; flushed on close
      this._accumulateFilenameMatches(chunk)
    })

    // ── Task 3: File list (all files matching query in name) ─────────────
    // rg --max-filesize 0K --files [--iglob/-g] "*<query>*"
    const task3Args: string[] = [
      "--max-filesize", "0K",
      "--files",
      "--no-messages",
      caseSensitive ? "-g" : "--iglob",
      `*${escapedQuery}*`,
    ]
    const task3 = run.track(run.spawn(rg, task3Args, cwd))

    task3.stdout?.on("data", (chunk: string) => {
      const lines = chunk.split(/\r?\n/g)
      for (const line of lines) {
        if (!line || line.length > 10000) continue
        // Accumulate filename-only result; flushed on close
        this._addFilenameOnlyResult(this._absPath(line))
      }
    })

  }

  /** Ripgrep prints paths relative to cwd (mountFolder); make them absolute. */
  private _absPath(rawPath: string): string {
    return toAbsolutePath(this.mountFolder, rawPath)
  }

  /** Drop per-run parsing/accumulation state. */
  private _resetRunState(): void {
    this._contentParser.reset()
    this._pathParser.reset()
    this._resultsByPath.clear()
  }

  /** Task 1: accumulate content match records into per-file results. */
  private _accumulateContentMatches(chunk: string): void {
    for (const data of this._contentParser.feed(chunk)) {
      const rawPath = matchPathOf(data)
      if (rawPath === null) continue
      const absPath = this._absPath(rawPath)

      // Accumulate into per-file result instead of emitting one-per-match.
      let entry = this._resultsByPath.get(absPath)
      if (!entry) {
        entry = { filePath: absPath, matches: [], totalMatches: 0 }
        this._resultsByPath.set(absPath, entry)
      }
      entry.matches.push(toSearchMatch(data))
    }
  }

  /** Task 2: accumulate pathMatch-only records; keep content matches intact. */
  private _accumulateFilenameMatches(chunk: string): void {
    for (const data of this._pathParser.feed(chunk)) {
      const rawPath = matchPathOf(data)
      if (rawPath === null) continue
      // Only create an entry if we don't already have one from Task 1 content matches.
      this._addFilenameOnlyResult(this._absPath(rawPath))
    }
  }

  private _addFilenameOnlyResult(absPath: string): void {
    if (!this._resultsByPath.has(absPath)) {
      this._resultsByPath.set(absPath, {
        filePath: absPath,
        matches: [],
        totalMatches: 0,
      })
    }
  }

  private _flushResults(onResult: (result: SearchResult) => void, onComplete?: () => void): void {
    for (const result of this._resultsByPath.values()) {
      result.totalMatches = result.matches.length
      onResult(result)
    }
    this._resultsByPath.clear()
    onComplete?.()
  }

  /**
   * Scan the vault for whole-file presence of each pattern.
   *
   * One `rg -l` run per pattern, at most {@link NEGATION_SCAN_CONCURRENCY} at a
   * time. `-l` stops at the first match per file, so output is one path per
   * occurring file — far cheaper than a full JSON scan, and it tells us *which*
   * pattern occurred, which a combined scan cannot (ripgrep reports only the
   * leftmost match, so `foo|foobar` would never report `foobar`).
   *
   * Returns `supported: false` on macOS, where search is delegated to Typora's
   * native engine and no per-file facts are available.
   */
  async listFilesContaining(
    patterns: string[],
    options?: SearchOptions,
  ): Promise<WholeFileFacts> {
    const files = new Map<string, Set<string>>()
    if (patterns.length === 0) return { supported: true, ok: true, files }
    if (isNativeBridgePlatform()) return { supported: false, ok: true, files }

    const rg = resolveRipgrepPath()
    if (!rg) return { supported: true, ok: false, files }

    const caseSensitive = options?.caseSensitive ?? false
    const wholeWord = options?.wholeWord ?? false
    const semaphore = new Semaphore(NEGATION_SCAN_CONCURRENCY)

    const scans = await Promise.all(patterns.map(pattern => semaphore.run(() =>
      this._processes.scanFilesWithMatches(
        rg,
        buildFilesWithMatchesArgs(pattern, caseSensitive, wholeWord),
        this.mountFolder,
      )
    )))

    let ok = true
    for (let i = 0; i < scans.length; i++) {
      if (!scans[i].ok) ok = false
      for (const rawPath of scans[i].paths) {
        const absPath = this._absPath(rawPath)
        let set = files.get(absPath)
        if (!set) {
          set = new Set<string>()
          files.set(absPath, set)
        }
        set.add(patterns[i])
      }
    }
    return { supported: true, ok, files }
  }

  /** Build ripgrep arguments for content search. */
  private _buildRpArgs(
    query: string | string[],
    caseSensitive: boolean,
    wholeWord: boolean,
  ): string[] {
    const patterns = typeof query === 'string' ? [query] : query

    const args: string[] = [
      "--json",
      "-F",           // fixed string match (no regex)
      "--no-multiline",
      "-n",           // show line numbers
      "-m", "10",     // max 10 matches per file
      "--max-filesize", "2M",
      "-g", "!.*",
      "--no-messages",
    ]

    // Each pattern gets its own -e flag (OR semantics at the ripgrep level).
    // The AST evaluation in buildResult enforces AND later.
    for (const p of patterns) {
      args.push("-e", p)
    }

    // Insert case-insensitive flag after -F
    if (!caseSensitive) {
      args.splice(args.indexOf("-F") + 1, 0, "-i")
    }
    // Insert whole-word flag before the -e patterns
    if (wholeWord) {
      const firstPatternIdx = args.indexOf("-e")
      if (firstPatternIdx >= 0) {
        args.splice(firstPatternIdx, 0, "-w")
      }
    }

    return args
  }

  /** Escape special regex characters in a string. */
  private _escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }
}
