/**
 * filename: syntax handler
 *
 * Matches file names by checking the file path from EvalContext.
 * Supports both index-only search (metadata cache scan) and
 * ripgrep-enriched search.
 *
 * Query example:
 *   filename:doc  → find files whose name contains "doc"
 */

import path from 'src/path'
import type { FieldNode, SyntaxHandler, EvalContext } from '../types'
import type { SearchMatch } from '../../text-search-service'

export const FilenameSyntaxHandler: SyntaxHandler = {
  name: 'filename',

  tryParse(value: string): FieldNode | null {
    return { type: 'field', field: 'filename', pattern: value }
  },

  extractSearchText(): string | null {
    // filename is handled by evaluate() against the file path, not body text search
    return null
  },

  evaluate(node: FieldNode, context: EvalContext): boolean {
    if (!context.filePath) return false
    const fileName = path.basename(context.filePath)
    return fileName.toLowerCase().includes(node.pattern.toLowerCase())
  },

  collectFieldMatches(node: FieldNode, context: EvalContext): SearchMatch[] {
    if (!context.filePath) return []
    const fileName = path.basename(context.filePath)
    return [{
      lineNumber: 0,
      lineText: `filename: ${fileName}`,
      matchedText: node.pattern,
      source: 'field:filename' as any,
    }]
  },
}
