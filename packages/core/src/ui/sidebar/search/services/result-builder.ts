import type { ParsedAST, FieldNode, TermNode, AndNode, OrNode, NotNode, ASTNode } from './query-parser'
import type { SearchResult, SearchMatch, MatchSource } from './text-search-service'
import type { TagObject } from 'src/utils'

/**
 * Build an enriched SearchResult by evaluating the AST against text matches + metadata.
 * Returns null if the file doesn't satisfy the query conditions.
 */
export function buildSearchResult(
  textResult: SearchResult,
  frontmatter: Record<string, any>,
  ast: ParsedAST,
  tags?: TagObject[],
): SearchResult | null {

  // Collect all tokens from body matches (for bare word verification)
  const bodyTokens = collectBodyTokens(textResult.matches)

  // Collect inline tag names from matched lines (#word patterns)
  const inlineTags = collectInlineTagPatterns(textResult.matches)

  // Evaluate AST against body tokens + frontmatter + inline tags
  if (!evaluateAST(ast, bodyTokens, frontmatter, inlineTags)) {
    return null
  }

  // Enrich each match with source information
  const enrichedMatches: SearchMatch[] = textResult.matches.map(match => ({
    ...match,
    source: 'body' as const,
  }))

  // Add field matches from frontmatter that satisfy the query
  const fieldMatches = collectFieldMatches(ast, frontmatter, tags)
  enrichedMatches.push(...fieldMatches)

  return {
    filePath: textResult.filePath,
    matches: enrichedMatches,
    totalMatches: enrichedMatches.length,
  }
}

/** Collect all unique tokens from search matches. */
function collectBodyTokens(matches: SearchMatch[]): Set<string> {
  const tokens = new Set<string>()
  for (const match of matches) {
    // Tokenize the line text to extract individual words
    const lineTokens = tokenizeLine(match.lineText)
    lineTokens.forEach(t => tokens.add(t.toLowerCase()))
  }
  return tokens
}

/** Collect inline tag names from search matches — words preceded by #. */
export function collectInlineTagPatterns(matches: SearchMatch[]): Set<string> {
  const tags = new Set<string>()
  for (const match of matches) {
    // Match #word patterns where word is alphanumeric/underscore/hyphen
    const inlineTags = match.lineText.match(/#([a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af][a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af0-9_-]*)/g)
    if (inlineTags) {
      for (const tag of inlineTags) {
        // Strip the leading # and store lowercase
        tags.add(tag.slice(1).toLowerCase())
      }
    }
  }
  return tags
}

/** Simple tokenizer: split by whitespace and punctuation, keep alphanumeric sequences. */
function tokenizeLine(text: string): string[] {
  const matches = text.match(/[a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g)
  return matches ? matches.map(m => m.toLowerCase()) : []
}

/** Collect field matches from frontmatter that satisfy the query. */
export function collectFieldMatches(
  ast: ParsedAST,
  frontmatter: Record<string, any>,
  tags?: TagObject[],
): SearchMatch[] {
  const matches: SearchMatch[] = []

  const visit = (node: ASTNode) => {
    if (node.type === 'and' || node.type === 'or') {
      for (const child of (node as typeof node & { children: ParsedAST[] }).children) {
        visit(child)
      }
    } else if (node.type === 'not') {
      // Negated fields don't produce matches, skip
    } else if (node.type === 'field') {
      const fieldNode = node as FieldNode

      // For tag fields, find ALL matching tags with their individual line numbers
      if (fieldNode.field === 'tag') {
        const tagsList = frontmatter.tags
        if (Array.isArray(tagsList)) {
          for (let i = 0; i < tagsList.length; i++) {
            if (tagsList[i].includes(fieldNode.pattern)) {
              let lineNumber = 0
              if (tags) {
                lineNumber = tags[i]?.lineNumber ?? 0
              }
              matches.push({
                lineNumber, // real line number for this specific tag
                lineText: `tag: ${tagsList[i]}`,
                matchedText: tagsList[i],
                source: 'field:tag' as MatchSource,
              })
            }
          }
        } else if (typeof tagsList === 'string') {
          // Single string tag — no per-item positions available
          if (tagsList.includes(fieldNode.pattern)) {
            matches.push({
              lineNumber: 0,
              lineText: `tag: ${tagsList}`,
              matchedText: fieldNode.pattern,
              source: 'field:tag' as MatchSource,
            })
          }
        }
      } else {
        // Non-tag fields (title, filename) — single value match
        const value = getFieldFromFrontmatter(frontmatter, fieldNode.field)
        if (value && value.includes(fieldNode.pattern)) {
          matches.push({
            lineNumber: 0, // title/filename don't have per-item positions
            lineText: `${fieldNode.field}: ${value}`,
            matchedText: fieldNode.pattern,
            source: `field:${fieldNode.field}` as MatchSource,
          })
        }
      }
    } else if (node.type === 'term') {
      // Body terms are already in textResult.matches
    }
  }

  visit(ast)
  return matches
}

/** Extract a field value from frontmatter. */
function getFieldFromFrontmatter(frontmatter: Record<string, any>, field: string): string | null {
  switch (field) {
    case 'tag': {
      const tags = frontmatter.tags
      if (Array.isArray(tags)) {
        return tags.join(', ')
      }
      if (typeof tags === 'string') {
        return tags.includes(field) ? tags : null
      }
      return null
    }
    case 'title':
      return String(frontmatter.title ?? '')
    default:
      return null
  }
}

/** Evaluate the AST against body tokens and frontmatter. */
export function evaluateAST(
  ast: ParsedAST,
  bodyTokens: Set<string>,
  frontmatter: Record<string, any>,
  inlineTags?: Set<string>,
): boolean {
  switch (ast.type) {
    case 'and': {
      const node = ast as AndNode
      return node.children.every(child => evaluateAST(child, bodyTokens, frontmatter, inlineTags))
    }

    case 'or': {
      const node = ast as OrNode
      return node.children.some(child => evaluateAST(child, bodyTokens, frontmatter, inlineTags))
    }

    case 'not': {
      const node = ast as NotNode
      return !evaluateAST(node.child, bodyTokens, frontmatter, inlineTags)
    }

    case 'term': {
      const node = ast as TermNode
      if (node.isQuoted) {
        // Quoted phrase: check if the exact text appears in any match line
        for (const token of bodyTokens) {
          if (token.includes(node.pattern.toLowerCase())) return true
        }
        return false
      }
      // Bare word: ripgrep already confirmed it's in the body, just verify
      return bodyTokens.has(node.pattern.toLowerCase())
    }

    case 'field': {
      const node = ast as FieldNode
      switch (node.field) {
        case 'tag': {
          // Check frontmatter tags first
          const fmTags = frontmatter.tags
          if (Array.isArray(fmTags)) {
            if (fmTags.some((t: string) => t.includes(node.pattern))) return true
          }
          if (typeof fmTags === 'string') {
            if (fmTags.includes(node.pattern)) return true
          }
          // Also check inline tags from body text (#word patterns)
          if (inlineTags && inlineTags.has(node.pattern.toLowerCase())) {
            return true
          }
          return false
        }

        case 'title': {
          const title = String(frontmatter.title ?? '')
          return title.includes(node.pattern)
        }

        case 'filename': {
          // Filename is handled by ripgrep Task 2/3, always pass through
          return true
        }

        default:
          return false
      }
    }
  }

  return false
}
