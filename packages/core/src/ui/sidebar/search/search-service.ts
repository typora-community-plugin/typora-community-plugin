import { bridge } from "typora"
import type { ChildProcess } from "node:child_process"
import path from "src/path"
import { platform } from "src/common/constants"
import { noop } from "src/utils"

/**
 * Result of a single line match from ripgrep.
 */
export interface SearchMatch {
  /** Line number (1-based) */
  lineNumber: number
  /** Full line text */
  lineText: string
  /** The matched substring within the line */
  matchedText: string
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
 * Results are streamed via JSON Lines from ripgrep stdout, parsed incrementally,
 * and rendered into the existing Typora DOM structure (#file-library-search-result).
 */
export class RipgrepSearchService {

  private _rpTask1: ChildProcess | null = null  // content match
  private _rpTask2: ChildProcess | null = null  // filename fuzzy match
  private _rpTask3: ChildProcess | null = null  // file list (filename only)

  /** Accumulator for streaming JSON Lines from task1 */
  private _prevBuffer = ""
  /** Accumulator for streaming JSON Lines from task2 (pathMatch=true) */
  private _pathPrevBuffer = ""

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
  /** Tracks how many tasks have closed; flush only when all 3 are done. */
  private _tasksClosedCount = 0

  constructor(
    private mountFolder: string,
  ) {}

  /** Kill all running ripgrep processes. Call before starting a new search. */
  cancel(): void {
    this._killTask(this._rpTask1)
    this._killTask(this._rpTask2)
    this._killTask(this._rpTask3)
    this._rpTask1 = null
    this._rpTask2 = null
    this._rpTask3 = null
    this._resultsByPath.clear()
    this._tasksClosedCount = 0
  }

  /**
   * Execute global search. On Windows/Linux, spawns 3 parallel ripgrep processes.
   * On macOS, delegates to native bridge handler.
   */
  execute(
    query: string,
    options?: { caseSensitive?: boolean; wholeWord?: boolean },
    onResult?: (result: SearchResult) => void,
  ): void {
    this.cancel()

    const caseSensitive = options?.caseSensitive ?? false
    const wholeWord = options?.wholeWord ?? false

    if (platform() === 'darwin') {
      this._executeOnMac(query, caseSensitive, wholeWord, onResult)
    } else {
      this._executeOnNode(query, caseSensitive, wholeWord, onResult)
    }
  }

  /**
   * Execute global search on macOS.
   */
  private _executeOnMac(
    query: string,
    caseSensitive: boolean,
    wholeWord: boolean,
    onResult?: (result: SearchResult) => void,
  ): void {
    // macOS: use bridge.callHandler("library.search", ...) which invokes native ripgrep
    const nfdQuery = this._normalizeNFD(query)

    bridge.callHandler("library.search", {
      text: query,
      caseSensitive: caseSensitive || false,
      wholeWord: wholeWord || false,
      args: this._buildRpArgs(query, nfdQuery, caseSensitive, wholeWord),
    }, () => {
      // Callback fires when search completes; results are streamed via
      // bridge.registerHandler("globalSearch.onSearchUpdate", ...) in Typora's frame.js
    })
  }

  private _executeOnNode(
    query: string,
    caseSensitive: boolean,
    wholeWord: boolean,
    onResult: (result: SearchResult) => void = noop,
  ): void {
    const rg = this._getRipgrepPath()
    if (!rg) return

    const child_process = this._reqChildProcess()
    const cwd = this.mountFolder

    // Helper to spawn a ripgrep process
    const spawnRg = (args: string[]): ChildProcess => {
      const proc = child_process.spawn(rg, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      })
      proc.stdout.setEncoding("utf8")
      proc.stderr.setEncoding("utf8")
      return proc
    }

    // ── Task 1: Content match (file content search) ──────────────────────
    // rg --json -F -n -m 10 --max-filesize 2M -g "!.*" [--iglob/-i] [--w] <query>
    const task1Args = this._buildRpArgs(query, this._normalizeNFD(query), caseSensitive, wholeWord)
    const task1 = spawnRg(task1Args)
    this._rpTask1 = task1

    task1.stdout?.on("data", (chunk: string) => {
      this._parseJsonLines(chunk, false)
    })
    task1.on("close", () => {
      this._rpTask1 = null
      this._flushResults(onResult)
    })
    task1.stderr?.on("data", () => {
      // Silently ignore stderr (ripgrep warnings about permission denied, etc.)
    })

    // ── Task 2: Filename fuzzy match (top 2 files by filename) ───────────
    // rg -m 2 --max-filesize 2M ".*" -H -U --json --no-messages [--iglob/-i] <query>
    const escapedQuery = this._escapeRegExp(query)
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
    const task2 = spawnRg(task2Args)
    this._rpTask2 = task2

    task2.stdout?.on("data", (chunk: string) => {
      // pathMatch=true: accumulated into _resultsByPath; flushed on close
      this._parseJsonLines(chunk, true)
    })
    task2.on("close", () => {
      this._rpTask2 = null
      this._flushResults(onResult)
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
    const task3 = spawnRg(task3Args)
    this._rpTask3 = task3

    let task3HasResults = false
    task3.stdout?.on("data", (chunk: string) => {
      const lines = chunk.split(/\r?\n/g)
      for (const line of lines) {
        if (!line || line.length > 10000) continue
        // Ripgrep outputs relative paths; make absolute
        const absPath = path.isAbsolute(line)
          ? line
          : path.join(this.mountFolder, line)
        // Accumulate filename-only result; flushed on close
        this._resultsByPath.set(absPath, {
          filePath: absPath,
          matches: [],
          totalMatches: 0,
        })
        task3HasResults = true
      }
    })
    task3.on("close", () => {
      this._rpTask3 = null
      this._flushResults(onResult)
    })

  }

  /**
   * Parse ripgrep JSON Lines output and convert to SearchResult objects.
   *
   * Ripgrep --json outputs one JSON object per line:
   * - {"type":"match","data":{"path":{"text":"..."},"span":{"line":N,...},"lines":["..."],"submatches":[...]}}
   * - {"type":"stats","data":{"matches":N,...}}
   */
  private _parseJsonLines(
    chunk: string,
    pathMatch: boolean,
  ): void {
    // Accumulate buffer to handle partial JSON lines across chunks
    const buf = pathMatch ? this._pathPrevBuffer : this._prevBuffer
    const combined = buf + chunk

    // Split into complete lines (last element may be incomplete)
    const lines = combined.split(/\r?\n/g)
    const completeLines = lines.slice(0, -1)

    // Save potentially incomplete last line back to buffer
    if (pathMatch) {
      this._pathPrevBuffer = lines.at(-1) ?? ""
    } else {
      this._prevBuffer = lines.at(-1) ?? ""
    }

    for (const line of completeLines) {
      if (!line.trim()) continue

      let parsed: { type: string; data?: Record<string, unknown> | undefined }
      try {
        parsed = JSON.parse(line)
      } catch {
        // Skip malformed JSON lines
        continue
      }

      if (parsed.type !== "match" || !parsed.data) continue

      this._processMatch(parsed.data as Record<string, unknown>, pathMatch)
    }
  }

  private _processMatch(
    data: Record<string, unknown>,
    pathMatch: boolean,
  ): void {
    const pathData = data.path as Record<string, unknown> | undefined
    if (!pathData?.text) return

    const filePath = pathData.text as string

    // Ripgrep outputs paths relative to cwd (mountFolder); make absolute
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.mountFolder, filePath)

    // For content matches (pathMatch=false), extract line info and submatches
    if (!pathMatch) {
      const span = data.span as Record<string, unknown> | undefined
      const linesData = data.lines as { text: string }
      const submatches = data.submatches as Array<Record<string, unknown>> | undefined

      let lineNumber = 0
      let lineText = ""
      let matchedText = ""

      if (span) {
        lineNumber = (span.line as number) ?? 0
      }
      if (linesData?.text?.length) {
        lineText = linesData.text.replace(/[\r\n]/g, "")
      }
      if (submatches?.length) {
        const firstSubmatch = submatches[0] as Record<string, unknown>
        const matchData = firstSubmatch.match as Record<string, unknown> | undefined
        matchedText = matchData?.text as string ?? ""
      }

      // Accumulate into per-file result instead of emitting one-per-match.
      // This mirrors Typora's native begin→match×N→end accumulator pattern.
      let entry = this._resultsByPath.get(absPath)
      if (!entry) {
        entry = { filePath: absPath, matches: [], totalMatches: 0 }
        this._resultsByPath.set(absPath, entry)
      }
      entry.matches.push({ lineNumber, lineText, matchedText })

    } else {
      // Filename-only match (pathMatch=true): accumulate into per-file result.
      // Only create an entry if we don't already have one from Task 1 content matches.
      if (!this._resultsByPath.has(absPath)) {
        this._resultsByPath.set(absPath, {
          filePath: absPath,
          matches: [],
          totalMatches: 0,
        })
      }
    }
  }

  /** Flush all accumulated results and emit them via onResult.
   * Only emits after ALL 3 tasks have closed, so that a file appearing in
   * multiple tasks (e.g., Task 1 content + Task 2 filename-only) gets merged
   * into ONE complete SearchResult instead of duplicate DOM entries.
   */
  private _flushResults(onResult: (result: SearchResult) => void): void {
    this._tasksClosedCount++
    if (this._tasksClosedCount < 3) {
      return
    }
    for (const result of this._resultsByPath.values()) {
      result.totalMatches = result.matches.length
      onResult(result)
    }
    this._resultsByPath.clear()
    this._tasksClosedCount = 0
  }

  /** Kill a child process and clean up references. */
  private _killTask(proc: ChildProcess | null): void {
    if (proc && !proc.killed) {
      try { proc.kill() } catch { /* ignore */ }
    }
  }

  /** Get the ripgrep binary path from vscode-ripgrep. */
  private _getRipgrepPath(): string | null {
    try {
      const rgModule = (globalThis as any).reqnode?.("vscode-ripgrep")
      if (!rgModule) return null

      // Handle both asar and non-asar paths
      let path = (rgModule as any).rgPath ?? ""
      path = path.replace("node_modules.asar", "node_modules")
      return path || null
    } catch {
      return null
    }
  }

  /** Require child_process module. */
  private _reqChildProcess(): typeof import("child_process") {
    return (globalThis as any).reqnode?.("child_process") ?? require("child_process")
  }

  /** Build ripgrep arguments for content search. */
  private _buildRpArgs(
    query: string,
    nfdQuery: string,
    caseSensitive: boolean,
    wholeWord: boolean,
  ): string[] {
    const args: string[] = [
      "--json",
      "-F",           // fixed string match (no regex)
      "--no-multiline",
      "-n",           // show line numbers
      "-m", "10",     // max 10 matches per file
      "--max-filesize", "2M",
      "-g", "!.*",    // respect .gitignore (match all files)
      "--no-messages",
      "--",
      query,          // search term at the end
    ]

    if (!caseSensitive) {
      args.splice(args.indexOf("-F") + 1, 0, "-i")
    }
    if (wholeWord) {
      const dashIdx = args.indexOf("--")
      if (dashIdx >= 0) {
        args.splice(dashIdx, 0, "-w")
      }
    }

    return args
  }

  /** Normalize query to NFD form for better Unicode matching on macOS. */
  private _normalizeNFD(str: string): string {
    return str.normalize("NFD")
  }

  /** Escape special regex characters in a string. */
  private _escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }
}
