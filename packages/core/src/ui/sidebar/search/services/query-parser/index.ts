/**
 * Query Parser — converts structured search queries into an AST.
 *
 * This is the main entry point for the refactored query-parser module.
 * Architecture:
 *  - Tokenizer (./tokenizer)  → raw tokens
 *  - SyntaxHandlers (./syntax/)  → parse recognized tokens into AST nodes
 *  - Registry (below)         → dispatches tokens to the right handler
 *
 * Usage:
 *   import { tryParse, parse, registerHandler } from './query-parser'
 *   registerHandler(MyCustomHandler)       // extend with custom field syntax
 *   const ast = tryParse('tag:#foo bar')   // → ParsedAST or null
 *
 * Backward-compatible exports:
 *   - tryParse, parse, FIELD_KINDS, FieldKind, isFieldPrefix
 *   - All AST types (ParsedAST, FieldNode, TermNode, etc.)
 */

import { tokenize } from './tokenizer'
import type { RawToken } from './tokenizer'
import {
  TagSyntaxHandler,
  TitleSyntaxHandler,
  FilenameSyntaxHandler,
  tryParseBareword,
  evaluateTerm,
} from './syntax'
import type {
  ParsedAST,
  AndNode,
  OrNode,
  NotNode,
  FieldNode,
  TermNode,
  SyntaxHandler,
  EvalContext,
} from './types'

// ── Re-export all types (backward compat) ──────────────────────────────

export type {
  ParsedAST,
  AndNode,
  OrNode,
  NotNode,
  FieldNode,
  TermNode,
  SyntaxHandler,
  EvalContext,
}
export type { ASTNodeType, ASTNode, FieldKind } from './types'
export { FIELD_KINDS, isFieldPrefix } from './types'

// Re-export helpers used by result-builder.ts
export { evaluateTerm } from './syntax'

// ── Handler Registry ───────────────────────────────────────────────────

const _handlers = new Map<string, SyntaxHandler>()

// Register built-in handlers
const _builtinHandlers: SyntaxHandler[] = [
  TagSyntaxHandler,
  TitleSyntaxHandler,
  FilenameSyntaxHandler,
]
for (const h of _builtinHandlers) {
  _handlers.set(h.name, h)
}

/**
 * Register a new field syntax handler.
 * The handler's `name` becomes the field prefix:
 *   registerHandler({ name: 'author', ... }) → query `author:john` is recognized
 */
export function registerHandler(handler: SyntaxHandler): void {
  _handlers.set(handler.name, handler)
}

/**
 * Get a registered handler by field name.
 * Used by result-builder.ts and index-search-service.ts for dispatch.
 */
export function getHandler(field: string): SyntaxHandler | undefined {
  return _handlers.get(field)
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Try to parse a query string into an AST.
 * Returns null if the query has no structured tokens (pure text search).
 *
 * Behavior mirrors the original monolithic parser exactly:
 *  - Single bare word → null (pure text)
 *  - Multiple bare words without quotes → null (pure text)
 *  - Any field prefix or quoted phrase → structured AST
 */
export function tryParse(query: string): ParsedAST | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const rawTokens = tokenize(trimmed)
  if (rawTokens.length === 0) return null

  // Convert raw tokens to AST nodes
  const astNodes: ParsedAST[] = []
  let hasStructured = false

  for (const raw of rawTokens) {
    const node = _parseRawToken(raw)
    if (node) {
      astNodes.push(node)
      // Quoted phrases and field tokens are considered "structured"
      if (raw.isQuoted || raw.isField) {
        hasStructured = true
      }
    }
  }

  // If no structured tokens exist → pure text search (no AST)
  if (!hasStructured && astNodes.length > 1) {
    return null
  }

  // Single term → return directly (not wrapped in AND)
  if (astNodes.length === 1) {
    return astNodes[0]
  }

  // Multiple terms → implicit AND
  return { type: 'and', children: astNodes } as AndNode
}

/**
 * Parse a query into an AST, always returning a tree.
 * Falls back to AND-of-all-barewords for pure text queries.
 */
export function parse(query: string): ParsedAST {
  const result = tryParse(query)
  if (result) return result

  // Pure text: build AND of all bare word terms
  const trimmed = query.trim()
  const rawTokens = tokenize(trimmed)
  const children: ParsedAST[] = rawTokens
    .filter(t => !t.isNegated)  // negation not meaningful in the fallback
    .map(t => tryParseBareword(t.value, t.isQuoted))

  return children.length === 1
    ? children[0]
    : { type: 'and', children }
}

// ── Internal ───────────────────────────────────────────────────────────

/**
 * Parse a single raw token into an AST node.
 * Dispatches to:
 *  1. Quoted token → TermNode
 *  2. Known field prefix → registered SyntaxHandler
 *  3. Colon-bearing token → try custom handlers
 *  4. Default → bareword TermNode
 */
function _parseRawToken(raw: RawToken): ParsedAST | null {
  if (!raw.value) return null

  // 1. Quoted phrase
  if (raw.isQuoted) {
    return _wrapNegated(raw, tryParseBareword(raw.value, true))
  }

  // 2. Built-in field prefix detected by tokenizer
  if (raw.isField && raw.field) {
    const handler = _handlers.get(raw.field)
    if (handler) {
      const node = handler.tryParse(raw.value)
      if (node) return _wrapNegated(raw, node)
    }
  }

  // 3. Check for custom handler prefix via colon
  //    (tokenizer only detects tag/title/filename prefixes natively;
  //     custom prefixes like `author:john` arrive as bare words)
  const colonIdx = raw.value.indexOf(':')
  if (colonIdx > 0) {
    const prefix = raw.value.slice(0, colonIdx).toLowerCase()
    const handler = _handlers.get(prefix)
    if (handler) {
      const value = raw.value.slice(colonIdx + 1).trim()
      if (value) {
        const node = handler.tryParse(value)
        if (node) return _wrapNegated(raw, node)
      }
    }
  }

  // 4. Bare word default
  const node = tryParseBareword(raw.value, false)
  return raw.isNegated ? ({ type: 'not', child: node } as NotNode) : node
}

/** Wrap a node in NOT if the raw token is negated. */
function _wrapNegated(raw: RawToken, node: ParsedAST): ParsedAST {
  return raw.isNegated ? ({ type: 'not', child: node } as NotNode) : node
}
