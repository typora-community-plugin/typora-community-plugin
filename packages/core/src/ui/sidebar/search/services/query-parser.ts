/**
 * Query Parser — converts structured search queries into an AST.
 *
 * Grammar:
 *   query     := term (WHITESPACE term)*
 *   term      := NOT? (field | quoted | bareword)
 *   field     := TAG ':' value | TITLE ':' value | FILENAME ':' value
 *   quoted    := '"' .* '"'
 *   bareword  := [^\s-]+
 *   NOT       := '-'
 *
 * Examples:
 *   "tag:#foo bar"          → AND([field:tag:#foo, term:bar])
 *   "title:hello world"     → AND([term:title:hello, term:world])  (no field prefix)
 *   "-tag:#foo hello"       → AND([NOT field:tag:#foo, term:hello])
 *   '"exact phrase"'        → [term:"exact phrase"]
 */

export type ASTNodeType = 'and' | 'or' | 'not' | 'field' | 'term'

export interface ASTNode {
  type: ASTNodeType
}

export interface AndNode extends ASTNode {
  type: 'and'
  children: ParsedAST[]
}

export interface OrNode extends ASTNode {
  type: 'or'
  children: ParsedAST[]
}

export interface NotNode extends ASTNode {
  type: 'not'
  child: ParsedAST
}

export interface FieldNode extends ASTNode {
  type: 'field'
  field: FieldKind
  pattern: string
}

export interface TermNode extends ASTNode {
  type: 'term'
  /** The raw token text (for bare words) or the quoted phrase */
  pattern: string
  /** Whether this is a quoted phrase (exact match) */
  isQuoted: boolean
}

export type ParsedAST = AndNode | OrNode | NotNode | FieldNode | TermNode

/** Supported field prefixes for structured queries. */
export const FIELD_KINDS = ['tag', 'title', 'filename'] as const
export type FieldKind = (typeof FIELD_KINDS)[number]

/** Check if a string is a recognized field prefix. */
export function isFieldPrefix(str: string): str is FieldKind {
  return FIELD_KINDS.includes(str as FieldKind)
}

/**
 * Try to parse a query string into an AST.
 * Returns null if the query has no structured tokens (pure text search).
 */
export function tryParse(query: string): ParsedAST | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const terms = tokenize(trimmed)
  if (terms.length === 0) return null

  // Check if any term is a structured field token
  const hasStructured = terms.some(t => t.isField || t.isQuoted)

  if (!hasStructured && terms.length > 1) {
    // Multiple bare words without quotes → pure text search, no AST needed
    return null
  }

  if (terms.length === 1) {
    const t = terms[0]
    if (t.isField) {
      return { type: 'field', field: t.field!, pattern: t.value }
    }
    if (t.isQuoted) {
      return { type: 'term', pattern: t.value, isQuoted: true }
    }
    // Single bare word → pure text search
    return null
  }

  // Multiple terms → build AND tree
  const children = terms.map(t => {
    if (t.isNegated && !isFieldPrefix(t.field ?? '')) {
      // Negated bare word: -hello → NOT(term:hello)
      return { type: 'not', child: { type: 'term', pattern: t.value, isQuoted: false } } as NotNode
    }
    if (t.isNegated && t.field) {
      // Negated field: -tag:#foo → NOT(field:tag:#foo)
      return { type: 'not', child: { type: 'field', field: t.field!, pattern: t.value } } as NotNode
    }
    if (t.isField) {
      return { type: 'field', field: t.field!, pattern: t.value } as FieldNode
    }
    if (t.isQuoted) {
      return { type: 'term', pattern: t.value, isQuoted: true } as TermNode
    }
    // Bare word
    return { type: 'term', pattern: t.value, isQuoted: false } as TermNode
  })

  if (children.length === 1) return children[0]

  return { type: 'and', children }
}

/**
 * Parse a query string into an AST. Throws if parsing fails.
 */
export function parse(query: string): ParsedAST {
  const result = tryParse(query)
  if (!result) {
    // Fall back to AND of all bare words for pure text queries
    const terms = tokenize(query.trim())
    const children = terms.map(t => ({
      type: 'term' as const,
      pattern: t.value,
      isQuoted: false,
    }))
    return { type: 'and', children }
  }
  return result
}

// ── Tokenizer internals ────────────────────────────────────────────────

interface RawToken {
  value: string
  field?: FieldKind
  isField: boolean
  isQuoted: boolean
  isNegated: boolean
}

function tokenize(query: string): RawToken[] {
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

    // Field prefix: tag:, title:, filename:
    const fieldMatch = query.slice(i).match(/^(tag|title|filename):(.+?)(?=\s|$)/i)
    if (fieldMatch && isFieldPrefix(fieldMatch[1].toLowerCase() as FieldKind)) {
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
    const bareOffset = rest.search(/[\s"]/i)
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
