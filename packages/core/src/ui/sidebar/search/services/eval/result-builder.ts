import { getHandler, evaluateTerm, astHasField } from '../query-parser'
import type { ParsedAST, FieldNode, AndNode, OrNode, NotNode, EvalContext, TermNode } from '../query-parser'
import type { SearchResult, SearchMatch } from '../text-search-service'
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
  filePatterns?: Set<string>,
): SearchResult | null {

  // Collect all tokens from body matches (for bare word verification)
  const bodyTokens = collectBodyTokens(textResult.matches)

  // Collect inline tag names from matched lines (#word patterns)
  const inlineTags = collectInlineTagPatterns(textResult.matches)

  // Build eval context shared across all evaluation phases
  const rawLines = textResult.matches.map(m => m.lineText.toLowerCase())
  const context: EvalContext = { bodyTokens, rawLines, frontmatter, tags, titles, inlineTags, filePath: textResult.filePath }
  if (filePatterns) context.filePatterns = filePatterns

  // Evaluate AST against body tokens + frontmatter + inline tags
  if (!evaluateAST(ast, context)) {
    return null
  }

  // Check if the query involves a tag: field — only then apply #-position validation
  // on body matches (prevents url#anchor being treated as #tag).
  const hasTagField = astHasField(ast, 'tag')

  // Enrich each match with source information, filtering out false positive
  // #tag matches where # is not at a valid position (line start or after whitespace)
  const enrichedMatches: SearchMatch[] = textResult.matches
    .filter(match => {
      if (hasTagField && match.matchedText.startsWith('#')) {
        return _isInlineTagAtValidPosition(match.lineText, match.matchedText)
      }
      return true
    })
    .map(match => ({
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
    // #tag must be at line start or preceded by whitespace (not url#tag, C#, etc.)
    // Digits are allowed (including as the first char), so `#2D` is recognized.
    const inlineTags = match.lineText.match(/(?:^|\s)(#[a-zA-Z0-9\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af][a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af0-9_/-]*)/g)
    if (inlineTags) {
      for (const tag of inlineTags) {
        // Strip leading whitespace + # and store lowercase
        const name = tag.trim().slice(1)
        // Obsidian-style rule: a tag must contain at least one non-digit char,
        // so pure-numeric tags like #1984 are rejected.
        if (!name || /^\d+$/.test(name)) continue
        tags.add(name.toLowerCase())
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

/** Check whether the #tag matchedText appears at a valid position in the line. */
function _isInlineTagAtValidPosition(lineText: string, matchedText: string): boolean {
  let idx = 0
  while (idx < lineText.length) {
    idx = lineText.indexOf(matchedText, idx)
    if (idx === -1) return false
    if (idx === 0 || /\s/.test(lineText[idx - 1])) return true
    idx += matchedText.length
  }
  return false
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
      // Negation excludes a whole file: when whole-file facts are available,
      // re-evaluate the child against the entire file instead of the sampled
      // matching lines. Without facts (e.g. macOS native search) fall back to
      // the historical match-scoped behaviour.
      const childContext = context.filePatterns
        ? { ...context, scope: 'file' as const }
        : context
      return !evaluateAST(node.child, childContext)
    }

    case 'term': {
      return evaluateTerm(ast as TermNode, context)
    }

    case 'field': {
      const node = ast as FieldNode
      const handler = getHandler(node.field)
      if (!handler) return false
      if (context.scope === 'file') {
        // Body-side evidence for a field (e.g. `tag:` → `#foo`) is a whole-file
        // fact too; metadata-only fields (title/filename) return null and are
        // answered by the handler below.
        const text = handler.extractSearchText(node)
        if (text !== null && context.filePatterns?.has(text)) return true
      }
      return handler.evaluate(node, context)
    }
  }

  return false
}
