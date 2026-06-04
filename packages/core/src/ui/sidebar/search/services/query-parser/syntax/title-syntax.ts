/**
 * title: syntax handler
 *
 * Matches both the YAML frontmatter `title` field and markdown headings
 * from the `titles` metadata (TitleObject[]).
 * Does NOT search file body text (metadata-only).
 *
 * Query examples:
 *   title:meeting  → find files whose frontmatter title or headings contain "meeting"
 */

import type { FieldNode, SyntaxHandler, EvalContext } from '../types'
import type { SearchMatch, MatchSource } from '../../text-search-service'

export const TitleSyntaxHandler: SyntaxHandler = {
  name: 'title',

  tryParse(value: string): FieldNode | null {
    return { type: 'field', field: 'title', pattern: value }
  },

  extractSearchText(): string | null {
    // title is metadata-only, no body text search
    return null
  },

  evaluate(node: FieldNode, context: EvalContext): boolean {
    // 1. Check frontmatter.title (YAML field)
    const fmTitle = String(context.frontmatter.title ?? '')
    if (fmTitle.includes(node.pattern)) return true

    // 2. Check markdown headings from titles metadata
    if (context.titles?.some(t => t.name.includes(node.pattern))) return true

    return false
  },

  collectFieldMatches(node: FieldNode, context: EvalContext): SearchMatch[] {
    const matches: SearchMatch[] = []

    // 1. From frontmatter.title
    const fmValue = String(context.frontmatter.title ?? '')
    if (fmValue.includes(node.pattern)) {
      matches.push({
        lineNumber: 0,
        lineText: `title: ${fmValue}`,
        matchedText: node.pattern,
        source: 'field:title' as MatchSource,
      })
    }

    // 2. From titles metadata (markdown headings)
    if (context.titles) {
      for (const t of context.titles) {
        if (t.name.includes(node.pattern)) {
          matches.push({
            lineNumber: t.lineNumber,
            lineText: t.lineText,
            matchedText: t.name,
            source: 'field:title' as MatchSource,
          })
        }
      }
    }

    return matches
  },
}
