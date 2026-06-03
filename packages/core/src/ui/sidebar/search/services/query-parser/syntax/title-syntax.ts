/**
 * title: syntax handler
 *
 * Matches the YAML frontmatter `title` field only.
 * Does NOT search file body text (metadata-only).
 *
 * Query example:
 *   title:meeting  → find files whose frontmatter title contains "meeting"
 */

import type { FieldNode, SyntaxHandler, EvalContext } from '../types'
import type { SearchMatch, MatchSource } from '../../text-search-service'

export const TitleSyntaxHandler: SyntaxHandler = {
  name: 'title',

  tryParse(value: string): FieldNode | null {
    return { type: 'field', field: 'title', pattern: value }
  },

  extractSearchText(): string | null {
    // title is frontmatter-only, no body text search
    return null
  },

  evaluate(node: FieldNode, context: EvalContext): boolean {
    const title = String(context.frontmatter.title ?? '')
    return title.includes(node.pattern)
  },

  collectFieldMatches(node: FieldNode, context: EvalContext): SearchMatch[] {
    const value = String(context.frontmatter.title ?? '')
    if (value.includes(node.pattern)) {
      return [{
        lineNumber: 0,
        lineText: `title: ${value}`,
        matchedText: node.pattern,
        source: 'field:title' as MatchSource,
      }]
    }
    return []
  },
}
