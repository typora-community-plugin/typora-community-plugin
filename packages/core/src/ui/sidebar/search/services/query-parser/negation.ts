/**
 * Negation analysis over the query AST.
 *
 * Pure query-level helpers — no file system, no ripgrep. They answer:
 *   - which literal patterns does a negated sub-expression need?
 *   - does answering it require scanning file contents at all?
 *   - does a negation sit under an `OR`, so that the positive search alone
 *     cannot produce the result set?
 */

import { getHandler } from './index'
import type { ParsedAST, FieldNode } from './types'

/**
 * Collect every literal pattern that appears inside a negated sub-expression.
 *
 * - `-word` / `-"exact phrase"`  → the pattern itself
 * - `-tag:foo`                   → `#foo` (the handler's text form); the
 *                                  frontmatter side is answered by metadata
 * - `-title:` / `-filename:`     → skipped (metadata-only, already file-scoped)
 *
 * Returns distinct patterns in traversal order.
 */
export function collectNegationPatterns(ast: ParsedAST): string[] {
  const patterns: string[] = []
  const seen = new Set<string>()

  const add = (pattern: string) => {
    if (seen.has(pattern)) return
    seen.add(pattern)
    patterns.push(pattern)
  }

  const visit = (node: ParsedAST) => {
    if (node.type === 'not') {
      collectFromSubtree(node.child, add)
      return
    }
    if (node.type === 'and' || node.type === 'or') {
      for (const child of node.children) visit(child)
    }
  }

  visit(ast)
  return patterns
}

/** Collect every body-verifiable pattern inside a negated subtree. */
function collectFromSubtree(node: ParsedAST, add: (pattern: string) => void): void {
  switch (node.type) {
    case 'term':
      add(node.pattern)
      return
    case 'field': {
      const handler = getHandler((node as FieldNode).field)
      const text = handler ? handler.extractSearchText(node as FieldNode) : null
      if (text !== null) add(text)
      return
    }
    case 'and':
    case 'or':
      for (const child of node.children) collectFromSubtree(child, add)
      return
    case 'not':
      // Double negation: scanning the inner pattern is harmless (the AST still
      // decides the outcome), and it keeps the fact set complete.
      collectFromSubtree(node.child, add)
      return
  }
}

/**
 * Whether the query contains a negated condition that can only be verified by
 * scanning file contents. Metadata-only negations (`-title:`, `-filename:`,
 * and the frontmatter half of `-tag:`) do not need a scan.
 */
export function astHasBodyNegation(ast: ParsedAST): boolean {
  const visit = (node: ParsedAST): boolean => {
    if (node.type === 'not') return subtreeNeedsBody(node.child)
    if (node.type === 'and' || node.type === 'or') return node.children.some(visit)
    return false
  }
  return visit(ast)
}

/** Whether a negated sub-expression contains a body-verifiable condition. */
function subtreeNeedsBody(node: ParsedAST): boolean {
  switch (node.type) {
    case 'term':
      return true
    case 'field': {
      const handler = getHandler((node as FieldNode).field)
      return handler ? handler.extractSearchText(node as FieldNode) !== null : false
    }
    case 'and':
    case 'or':
      return node.children.some(subtreeNeedsBody)
    case 'not':
      return subtreeNeedsBody(node.child)
  }
}

/**
 * Whether a negation sits under an `OR` branch.
 *
 * Such queries cannot be answered from the positive text search alone: a file
 * that matches only the negated side (`foo OR -bar` for a file without `foo`)
 * never appears in the ripgrep results. Those queries enumerate the whole
 * metadata universe instead.
 */
export function astHasNegationUnderOr(ast: ParsedAST): boolean {
  const hasNot = (node: ParsedAST): boolean => {
    if (node.type === 'not') return true
    if (node.type === 'and' || node.type === 'or') return node.children.some(hasNot)
    return false
  }

  const visit = (node: ParsedAST): boolean => {
    if (node.type === 'or') return node.children.some(hasNot) || node.children.some(visit)
    if (node.type === 'and') return node.children.some(visit)
    return false
  }

  return visit(ast)
}

/**
 * Whether a negated **plain term** (`-word`, not `-tag:`/`-title:`) occurs in
 * the query. Only these require body text, so only these make files without a
 * body (images etc.) ineligible for a negation-only result set.
 */
export function astHasNegatedTerm(ast: ParsedAST): boolean {
  const visit = (node: ParsedAST): boolean => {
    if (node.type === 'not') return subtreeHasTerm(node.child)
    if (node.type === 'and' || node.type === 'or') return node.children.some(visit)
    return false
  }
  return visit(ast)
}

function subtreeHasTerm(node: ParsedAST): boolean {
  switch (node.type) {
    case 'term':
      return true
    case 'and':
    case 'or':
      return node.children.some(subtreeHasTerm)
    case 'not':
      return subtreeHasTerm(node.child)
    case 'field':
      return false
  }
}
