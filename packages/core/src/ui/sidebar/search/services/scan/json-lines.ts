/**
 * Streaming parser for `ripgrep --json` output (JSON Lines).
 *
 * Ripgrep prints one JSON object per line:
 * - {"type":"match","data":{"path":{"text":"..."},"span":{"line":N,...},"lines":["..."],"submatches":[...]}}
 * - {"type":"stats","data":{"matches":N,...}}
 *
 * Chunks arrive at arbitrary byte boundaries, so each stdout stream needs its
 * own buffered parser. Pure logic: no Node, no Typora — chunks in, match
 * records out.
 */


/** Where this match was found: 'body' (正文) or a field like 'tag', 'title' */
export type MatchSource = 'body' | `field:${string}`

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
  /** Where this match was found: 'body' (正文) or a field like 'tag', 'title' */
  source?: MatchSource
}

/** The `data` payload of a {"type":"match"} record. */
export type RgMatchData = Record<string, unknown>


/**
 * Buffering line splitter for one JSON-Lines stream.
 *
 * Partial trailing lines stay buffered until the next {@link feed}; complete
 * lines that are not `match` records (e.g. `stats`) and malformed JSON are
 * dropped.
 */
export class JsonLinesParser {

  /** Accumulator for the (possibly partial) trailing line. */
  private _buffer = ""

  /**
   * Feed a stdout chunk; returns the `data` of every complete `match` record
   * in it.
   */
  feed(chunk: string): RgMatchData[] {
    const combined = this._buffer + chunk
    const lines = combined.split(/\r?\n/g)

    // Save potentially incomplete last line back to buffer
    this._buffer = lines.at(-1) ?? ""

    const events: RgMatchData[] = []
    for (const line of lines.slice(0, -1)) {
      if (!line.trim()) continue

      let parsed: { type: string; data?: Record<string, unknown> }
      try {
        parsed = JSON.parse(line)
      } catch {
        // Skip malformed JSON lines
        continue
      }

      if (parsed.type !== "match" || !parsed.data) continue
      events.push(parsed.data)
    }
    return events
  }

  /** Drop any buffered partial line. Call when starting a new search run. */
  reset(): void {
    this._buffer = ""
  }
}


/**
 * The file path a match record refers to, as ripgrep printed it (relative to
 * the spawn cwd). Null for records without a usable path.
 */
export function matchPathOf(data: RgMatchData): string | null {
  const pathData = data.path as Record<string, unknown> | undefined
  const text = pathData?.text
  return typeof text === "string" && text ? text : null
}


/**
 * Extract line info and the matched text from a content match record.
 */
export function toSearchMatch(data: RgMatchData): SearchMatch {
  const span = data.span as Record<string, unknown> | undefined
  const linesData = data.lines as { text: string } | undefined
  const submatches = data.submatches as Array<Record<string, unknown>> | undefined

  // ripgrep --json outputs line_number at data top-level, NOT inside span
  const lineNumber = (data.line_number as number) ?? (span?.line as number) ?? 0

  const lineText = linesData?.text?.length
    ? linesData.text.replace(/[\r\n]/g, "")
    : ""

  const firstSubmatch = submatches?.length ? submatches[0] : undefined
  const matchData = firstSubmatch?.match as Record<string, unknown> | undefined
  const matchedText = matchData?.text as string ?? ""

  return { lineNumber, lineText, matchedText }
}
