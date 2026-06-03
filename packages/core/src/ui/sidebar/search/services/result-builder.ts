import { getHandler, evaluateTerm } from './query-parser'
import type { ParsedAST, FieldNode, AndNode, OrNode, NotNode, EvalContext, TermNode } from './query-parser'
import type { SearchResult, SearchMatch } from './text-search-service'
import type { TagObject, TitleObject } from 'src/utils'

/**
 * Build an enriched SearchResult by evaluating the AST against text matches + metadata.
 * Returns null if the file doesn't satisfy the query conditions.
 */
export function buildSearchResult(
  textResult: SearchResult,
  frontmatter: Record<string, any>,
  ast: ParsedAST,
  tags?: TagObject[],
  titles?: TitleObject[],
): SearchResult | null {

  // Collect all tokens from body matches (for bare word verification)
  const bodyTokens = collectBodyTokens(textResult.matches)

  // Collect inline tag names from matched lines (#word patterns)
  const inlineTags = collectInlineTagPatterns(textResult.matches)

  // Build eval context shared across all evaluation phases
  const context: EvalContext = { bodyTokens, frontmatter, tags, titles, inlineTags, filePath: textResult.filePath }

  // Evaluate AST against body tokens + frontmatter + inline tags
  if (!evaluateAST(ast, context)) {
    return null
  }

  // Enrich each match with source information
  const enrichedMatches: SearchMatch[] = textResult.matches.map(match => ({
    ...match,
    source: 'body' as const,
  }))

  // Add field matches from frontmatter that satisfy the query
  const fieldMatches = collectFieldMatches(ast, context)
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
  context: EvalContext,
): SearchMatch[] {
  const matches: SearchMatch[] = []

  const visit = (node: ParsedAST) => {
    if (node.type === 'and' || node.type === 'or') {
      for (const child of (node as AndNode | OrNode).children) {
        visit(child)
      }
    } else if (node.type === 'not') {
      // Negated fields don't produce matches, skip
    } else if (node.type === 'field') {
      const fieldNode = node as FieldNode
      const handler = getHandler(fieldNode.field)
      if (handler) {
        const fieldMatches = handler.collectFieldMatches(fieldNode, context)
        matches.push(...fieldMatches)
      }
    }
    // term nodes: body matches already in textResult.matches
  }

  visit(ast)
  return matches
}

/** Evaluate the AST against body tokens + frontmatter + inline tags. */
export function evaluateAST(
  ast: ParsedAST,
  context: EvalContext,
): boolean {
  switch (ast.type) {
    case 'and': {
      const node = ast as AndNode
      return node.children.every(child => evaluateAST(child, context))
    }

    case 'or': {
      const node = ast as OrNode
      return node.children.some(child => evaluateAST(child, context))
    }

    case 'not': {
      const node = ast as NotNode
      return !evaluateAST(node.child, context)
    }

    case 'term': {
      return evaluateTerm(ast as TermNode, context)
    }

    case 'field': {
      const node = ast as FieldNode
      const handler = getHandler(node.field)
      if (handler) return handler.evaluate(node, context)
      return false
    }
  }

  return false
}
