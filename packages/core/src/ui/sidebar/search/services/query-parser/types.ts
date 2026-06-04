/**
 * Core AST types + SyntaxHandler contract for extensible query parsing.
 *
 * Grammar:
 *   query     := or_expr
 *   or_expr   := and_expr ('OR' and_expr)*
 *   and_expr  := term+
 *   term      := NOT? (field | quoted | bareword)
 *   field     := PREFIX ':' value    (prefix registered via SyntaxHandler)
 *   quoted    := '"' .* '"'
 *   bareword  := [^\s-]+
 *   NOT       := '-'
 */

import type { TagObject, TitleObject } from 'src/utils'
import type { SearchMatch, MatchSource } from '../text-search-service'

// ── AST Node Types ─────────────────────────────────────────────────────

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
  /** The field name (e.g., 'tag', 'title', 'filename'). Extensible via SyntaxHandler registry. */
  field: string
  /** The pattern/value to match within that field */
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

// ── Known field constants (backward compat) ────────────────────────────

export const FIELD_KINDS = ['tag', 'title', 'filename'] as const
export type FieldKind = (typeof FIELD_KINDS)[number]

export function isFieldPrefix(str: string): str is FieldKind {
  return FIELD_KINDS.includes(str as FieldKind)
}

// ── EvalContext: passed to every evaluate() call ──────────────────────

export interface EvalContext {
  /** Tokens from ripgrep-matched lines (used for bareword verification) */
  bodyTokens: Set<string>
  /** Parsed YAML frontmatter */
  frontmatter: Record<string, any>
  /** Frontmatter tags with positional info (from YAML parser) */
  tags?: TagObject[]
  /** Markdown headings with positional info (from metadata provider) */
  titles?: TitleObject[]
  /** Inline #tag patterns extracted from body text */
  inlineTags?: Set<string>
  /** File path (relative for index-only, absolute for ripgrep path) for filename matching */
  filePath?: string
}

// ── SyntaxHandler interface ────────────────────────────────────────────

/**
 * Contract for each field syntax (e.g., `tag:`, `title:`, `filename:`).
 *
 * Implementations own the full lifecycle:
 *   1. tryParse        — recognize a `prefix:value` token → FieldNode
 *   2. extractSearchText — what text to send to ripgrep (null = no text search)
 *   3. evaluate        — does this node match (body + metadata)?
 *   4. collectFieldMatches — produce SearchMatch entries from metadata
 */
export interface SyntaxHandler {
  /** Unique name, also the field prefix (e.g., 'tag', 'title') */
  readonly name: string

  /**
   * Try to parse a field value into a FieldNode.
   * Called when the tokenizer detects `{name}:{value}`.
   * @param value  — the part after the colon (e.g., `#foo` from `tag:#foo`)
   * @returns FieldNode if recognized, null to fall through
   */
  tryParse(value: string): FieldNode | null

  /**
   * Extract the text pattern to search via ripgrep.
   * Return null for metadata-only fields (title, filename).
   */
  extractSearchText(node: FieldNode): string | null

  /**
   * Evaluate the node against the combined context (body + metadata).
   */
  evaluate(node: FieldNode, context: EvalContext): boolean

  /**
   * Collect field matches from metadata for result display.
   */
  collectFieldMatches(node: FieldNode, context: EvalContext): SearchMatch[]
}
