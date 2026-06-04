/**
 * Bare word + quoted phrase syntax handler
 *
 * Handles plain text tokens — both bare words (`hello`) and quoted phrases (`"hello world"`).
 * These are the primitive building blocks of the query language.
 *
 * Evaluate logic:
 *   - Quoted phrase: check if any body token includes the full phrase
 *   - Bare word: check if body token set contains the word (ripgrep already confirmed presence)
 */

import type { TermNode, ParsedAST, EvalContext } from '../types'

export interface BarewordToken {
  node: TermNode
}

/**
 * Try to parse a value as a bare word or quoted phrase.
 * Always succeeds — bare words/quotes are the fallback when no field handler matches.
 */
export function tryParseBareword(value: string, isQuoted: boolean): TermNode {
  return { type: 'term', pattern: value, isQuoted }
}

/**
 * Evaluate a TermNode against body tokens.
 * Bare words: ripgrep already confirmed presence, just verify in token set.
 * Quoted phrases: check body tokens first (fast path), then raw line text
 * (handles punctuation/colons stripped by tokenizeLine).
 */
export function evaluateTerm(node: TermNode, context: EvalContext): boolean {
  const pattern = node.pattern.toLowerCase()

  if (node.isQuoted) {
    // Fast path: check if any body token contains the phrase
    for (const token of context.bodyTokens) {
      if (token.includes(pattern)) return true
    }
    // Fallback: check raw line text (preserves colons, punctuation, etc.)
    if (context.rawLines) {
      for (const line of context.rawLines) {
        if (line.includes(pattern)) return true
      }
    }
    return false
  }

  // Bare word: ripgrep already confirmed it's in the body, just verify
  if (context.bodyTokens.has(pattern)) return true

  // Fallback for patterns with non-alpha chars (like #, :, etc.) that
  // tokenizeLine strips — check raw line text directly.
  if (context.rawLines) {
    for (const line of context.rawLines) {
      if (line.includes(pattern)) return true
    }
  }
  return false
}
