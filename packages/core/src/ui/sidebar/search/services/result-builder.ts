import type { ParsedAST, FieldNode, TermNode, AndNode, OrNode, NotNode, ASTNode } from './query-parser'
import type { SearchResult, SearchMatch, MatchSource } from './text-search-service'

/**
 * Build an enriched SearchResult by evaluating the AST against text matches + metadata.
 * Returns null if the file doesn't satisfy the query conditions.
 */
export function buildSearchResult(
  textResult: SearchResult,
  frontmatter: Record<string, any>,
  ast: ParsedAST,
): SearchResult | null {

  // Collect all tokens from body matches (for bare word verification)
  const bodyTokens = collectBodyTokens(textResult.matches)

  // Evaluate AST against body tokens + frontmatter
  if (!evaluateAST(ast, bodyTokens, frontmatter)) {
    return null
  }

  // Enrich each match with source information
  const enrichedMatches: SearchMatch[] = textResult.matches.map(match => ({
    ...match,
    source: 'body' as const,
  }))

  // Add field matches from frontmatter that satisfy the query
  const fieldMatches = collectFieldMatches(ast, frontmatter)
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

/** Simple tokenizer: split by whitespace and punctuation, keep alphanumeric sequences. */
function tokenizeLine(text: string): string[] {
  const matches = text.match(/[a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]+/g)
  return matches ? matches.map(m => m.toLowerCase()) : []
}

/** Collect field matches from frontmatter that satisfy the query. */
export function collectFieldMatches(ast: ParsedAST, frontmatter: Record<string, any>): SearchMatch[] {
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
      const value = getFieldFromFrontmatter(frontmatter, fieldNode.field)
      if (value && value.includes(fieldNode.pattern)) {
        matches.push({
          lineNumber: 0, // frontmatter match has no specific line in body
          lineText: `${fieldNode.field}: ${value}`,
          matchedText: fieldNode.pattern,
          source: `field:${fieldNode.field}` as MatchSource,
        })
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
): boolean {
  switch (ast.type) {
    case 'and': {
      const node = ast as AndNode
      return node.children.every(child => evaluateAST(child, bodyTokens, frontmatter))
    }

    case 'or': {
      const node = ast as OrNode
      return node.children.some(child => evaluateAST(child, bodyTokens, frontmatter))
    }

    case 'not': {
      const node = ast as NotNode
      return !evaluateAST(node.child, bodyTokens, frontmatter)
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
          const tags = frontmatter.tags
          if (Array.isArray(tags)) {
            return tags.some((t: string) => t.includes(node.pattern))
          }
          if (typeof tags === 'string') {
            return tags.includes(node.pattern)
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
