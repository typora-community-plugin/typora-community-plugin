/**
 * tag: syntax handler
 *
 * Matches both frontmatter tags and inline #tag patterns from body text.
 *
 * Query examples:
 *   tag:#foo      → find files tagged with #foo (frontmatter or inline)
 *   tag:project   → exact match for "project" (not "my-project")
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
    // 1. Check frontmatter tags (exact match only)
    const fmTags = context.frontmatter.tags
    if (Array.isArray(fmTags)) {
      if (fmTags.some((t: string) => t === node.pattern)) return true
    }
    if (typeof fmTags === 'string') {
      if (fmTags === node.pattern) return true
    }

    // 2. Check inline tags from body text (#word patterns) - case-insensitive exact match
    const patternLower = node.pattern.toLowerCase()
    for (const tag of context.inlineTags ?? []) {
      if (tag.toLowerCase() === patternLower) return true
    }

    return false
  },

  collectFieldMatches(node: FieldNode, context: EvalContext): SearchMatch[] {
    const matches: SearchMatch[] = []
    const tagsList = context.frontmatter.tags

    if (Array.isArray(tagsList)) {
      for (let i = 0; i < tagsList.length; i++) {
        if (tagsList[i] === node.pattern) {
          let lineNumber = 0
          let lineText = `tag: ${tagsList[i]}`
          if (context.tags) {
            lineNumber = context.tags[i]?.lineNumber ?? 0
            lineText = context.tags[i]?.lineText ?? lineText
          }
          matches.push({
            lineNumber,
            lineText,
            matchedText: tagsList[i],
            source: 'field:tag' as MatchSource,
          })
        }
      }
    } else if (typeof tagsList === 'string') {
      if (tagsList === node.pattern) {
        let lineNumber = 0
        let lineText = `tag: ${tagsList}`
        if (context.tags?.length) {
          lineNumber = context.tags[0].lineNumber
          lineText = context.tags[0].lineText
        }
        matches.push({
          lineNumber,
          lineText,
          matchedText: node.pattern,
          source: 'field:tag' as MatchSource,
        })
      }
    }

    return matches
  },
}
