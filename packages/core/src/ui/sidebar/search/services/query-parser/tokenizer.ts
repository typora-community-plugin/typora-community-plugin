/**
 * Low-level tokenizer for search queries.
 *
 * Outputs raw tokens with metadata (isQuoted, isNegated, field prefix detection).
 * The parser (index.ts) then dispatches each token to the registered SyntaxHandlers.
 */

import type { FieldKind } from './types'

// ── Raw Token ─────────────────────────────────────────────────────────

export interface RawToken {
  value: string
  field?: FieldKind
  isField: boolean
  isQuoted: boolean
  isNegated: boolean
}

/**
 * Tokenize a query string into RawToken array.
 *
 * Handles:
 *  - Whitespace separation
 *  - Double-quoted phrases ("...")
 *  - Negation prefix (-)
 *  - Field prefix detection (tag:/title:/filename:)
 *  - Bare words
 */
export function tokenize(query: string): RawToken[] {
  const tokens: RawToken[] = []
  let i = 0

  while (i < query.length) {
    // Skip whitespace
    if (/\s/.test(query[i])) {
      i++
      continue
    }

    // Quoted phrase: "..."
    if (query[i] === '"') {
      const end = query.indexOf('"', i + 1)
      if (end < 0) {
        // Unterminated quote — treat as bare word
        tokens.push({ value: query.slice(i + 1), isField: false, isQuoted: false, isNegated: false })
        break
      }
      const quoted = query.slice(i + 1, end).trim()
      if (quoted) {
        tokens.push({ value: quoted, isField: false, isQuoted: true, isNegated: false })
      }
      i = end + 1
      continue
    }

    // Check for negation prefix on next token
    let negated = false
    if (query[i] === '-') {
      negated = true
      i++
    }

    // Parentheses as group delimiters (may be negated: -(foo OR bar))
    if (query[i] === '(' || query[i] === ')') {
      tokens.push({ value: query[i], isField: false, isQuoted: false, isNegated: negated })
      i++
      continue
    }

    // Field prefix: tag:, title:, filename:
    // (known prefixes are checked here; custom prefixes from registered
    //  handlers are detected later by the parser via colon-splitting)
    const fieldMatch = query.slice(i).match(/^(tag|title|filename):(.+?)(?=\s|$)/i)
    if (fieldMatch && isKnownFieldPrefix(fieldMatch[1].toLowerCase())) {
      tokens.push({
        value: fieldMatch[2].trim(),
        field: fieldMatch[1].toLowerCase() as FieldKind,
        isField: true,
        isQuoted: false,
        isNegated: negated,
      })
      i += fieldMatch[0].length
      continue
    }

    // Bare word (may be preceded by -)
    const rest = query.slice(i)
    const bareOffset = rest.search(/[\s"()]/)
    const bareEnd = bareOffset < 0 ? -1 : i + bareOffset
    const bareWord = bareEnd < 0
      ? query.slice(i).trim()
      : query.slice(i, bareEnd).trim()
    if (bareWord) {
      tokens.push({ value: bareWord, isField: false, isQuoted: false, isNegated: negated })
    }
    i = bareEnd < 0 ? query.length : bareEnd
  }

  return tokens
}

const KNOWN_FIELD_PREFIXES = ['tag', 'title', 'filename']

function isKnownFieldPrefix(str: string): boolean {
  return KNOWN_FIELD_PREFIXES.includes(str)
}
