/**
 * filename: syntax handler
 *
 * Matches file names via ripgrep Task 2/3 (filename fuzzy + file list).
 * This handler is a pass-through: ripgrep handles filename matching,
 * the AST evaluator always returns true for filename nodes.
 *
 * Query example:
 *   filename:test  → find files whose name contains "test"
 */

import type { FieldNode, SyntaxHandler, EvalContext } from '../types'
import type { SearchMatch } from '../../text-search-service'

export const FilenameSyntaxHandler: SyntaxHandler = {
  name: 'filename',

  tryParse(value: string): FieldNode | null {
    return { type: 'field', field: 'filename', pattern: value }
  },

  extractSearchText(): string | null {
    // filename is handled by ripgrep Task2/3, not body text search
    return null
  },

  evaluate(): boolean {
    // Filename matching is delegated to ripgrep Task 2/3 via the original query text.
    // The AST evaluator doesn't need to re-check — if ripgrep found the file, it matches.
    return true
  },

  collectFieldMatches(): SearchMatch[] {
    // filename matches are already in textResult.matches from ripgrep
    return []
  },
}
