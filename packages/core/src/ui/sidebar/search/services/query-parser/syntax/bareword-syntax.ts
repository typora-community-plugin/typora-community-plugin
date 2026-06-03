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
 * Quoted phrases: check if any token contains the full phrase.
 */
export function evaluateTerm(node: TermNode, context: EvalContext): boolean {
  if (node.isQuoted) {
    // Quoted phrase: check if the exact text appears in any match line
    for (const token of context.bodyTokens) {
      if (token.includes(node.pattern.toLowerCase())) return true
    }
    return false
  }

  // Bare word: ripgrep already confirmed it's in the body, just verify
  return context.bodyTokens.has(node.pattern.toLowerCase())
}
