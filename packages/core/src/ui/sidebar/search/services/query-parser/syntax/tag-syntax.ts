/**
 * tag: syntax handler
 *
 * Matches both frontmatter tags and inline #tag patterns from body text.
 *
 * Query examples:
 *   tag:#foo      → find files tagged with #foo (frontmatter or inline)
 *   tag:project   → find files whose tags contain "project"
 */

import type { FieldNode, SyntaxHandler, EvalContext } from '../types'
import type { SearchMatch, MatchSource } from '../../text-search-service'

export const TagSyntaxHandler: SyntaxHandler = {
  name: 'tag',

  tryParse(value: string): FieldNode | null {
    return { type: 'field', field: 'tag', pattern: value }
  },

  extractSearchText(node: FieldNode): string | null {
    // Emit #pattern so ripgrep also matches inline tags in body text
    return `#${node.pattern}`
  },

  evaluate(node: FieldNode, context: EvalContext): boolean {
    // 1. Check frontmatter tags
    const fmTags = context.frontmatter.tags
    if (Array.isArray(fmTags)) {
      if (fmTags.some((t: string) => t.includes(node.pattern))) return true
    }
    if (typeof fmTags === 'string') {
      if (fmTags.includes(node.pattern)) return true
    }

    // 2. Check inline tags from body text (#word patterns)
    if (context.inlineTags?.has(node.pattern.toLowerCase())) {
      return true
    }

    return false
  },

  collectFieldMatches(node: FieldNode, context: EvalContext): SearchMatch[] {
    const matches: SearchMatch[] = []
    const tagsList = context.frontmatter.tags

    if (Array.isArray(tagsList)) {
      for (let i = 0; i < tagsList.length; i++) {
        if (tagsList[i].includes(node.pattern)) {
          let lineNumber = 0
          if (context.tags) {
            lineNumber = context.tags[i]?.lineNumber ?? 0
          }
          matches.push({
            lineNumber,
            lineText: `tag: ${tagsList[i]}`,
            matchedText: tagsList[i],
            source: 'field:tag' as MatchSource,
          })
        }
      }
    } else if (typeof tagsList === 'string') {
      if (tagsList.includes(node.pattern)) {
        matches.push({
          lineNumber: 0,
          lineText: `tag: ${tagsList}`,
          matchedText: node.pattern,
          source: 'field:tag' as MatchSource,
        })
      }
    }

    return matches
  },
}
