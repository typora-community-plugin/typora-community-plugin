/**
 * Whole-file negation semantics.
 *
 * `-word` must exclude a file when the word occurs anywhere in it, not only on
 * the lines ripgrep happened to sample. These tests pin that behaviour and the
 * fallback for platforms without whole-file facts.
 */

import { describe, it, expect } from '@jest/globals'

import { tryParse } from 'src/ui/sidebar/search/services/query-parser'
import type { EvalContext } from 'src/ui/sidebar/search/services/query-parser'
import { evaluateAST, buildSearchResult } from 'src/ui/sidebar/search/services/eval/result-builder'
import type { SearchResult } from 'src/ui/sidebar/search/services/text-search-service'

function ctx(overrides: Partial<EvalContext> = {}): EvalContext {
  return {
    bodyTokens: new Set<string>(),
    frontmatter: {},
    ...overrides,
  }
}

function facts(...patterns: string[]): Set<string> {
  return new Set(patterns)
}

function evaluate(query: string, context: EvalContext): boolean {
  const ast = tryParse(query)
  expect(ast).not.toBeNull()
  return evaluateAST(ast!, context)
}

describe('file-scoped negation', () => {

  it('excludes a file when the word occurs anywhere in it', () => {
    expect(evaluate('foo -bar', ctx({
      bodyTokens: new Set(['foo']),
      filePatterns: facts('bar'),
    }))).toBe(false)
  })

  it('keeps a file when the word does not occur', () => {
    expect(evaluate('foo -bar', ctx({
      bodyTokens: new Set(['foo']),
      filePatterns: facts(),
    }))).toBe(true)
  })

  it('ignores which lines ripgrep sampled', () => {
    // Only "foo" was sampled, yet the file contains "bar" elsewhere.
    expect(evaluate('foo -bar', ctx({
      bodyTokens: new Set(['foo']),
      rawLines: ['foo'],
      filePatterns: facts('bar'),
    }))).toBe(false)
  })

  it('falls back to match scope without whole-file facts', () => {
    expect(evaluate('foo -bar', ctx({
      bodyTokens: new Set(['foo', 'bar']),
    }))).toBe(false)
    expect(evaluate('foo -bar', ctx({
      bodyTokens: new Set(['foo']),
    }))).toBe(true)
  })

  it('excludes a file only when every term of a negated AND group occurs', () => {
    expect(evaluate('-(a b)', ctx({ filePatterns: facts('a', 'b') }))).toBe(false)
    expect(evaluate('-(a b)', ctx({ filePatterns: facts('a') }))).toBe(true)
    expect(evaluate('-(a b)', ctx({ filePatterns: facts('b') }))).toBe(true)
    expect(evaluate('-(a b)', ctx({ filePatterns: facts() }))).toBe(true)
  })

  it('excludes a file when any term of a negated OR group occurs', () => {
    expect(evaluate('-(a OR b)', ctx({ filePatterns: facts('a') }))).toBe(false)
    expect(evaluate('-(a OR b)', ctx({ filePatterns: facts('b') }))).toBe(false)
    expect(evaluate('-(a OR b)', ctx({ filePatterns: facts() }))).toBe(true)
  })

  it('applies several negations together', () => {
    expect(evaluate('-a -b', ctx({ filePatterns: facts('a') }))).toBe(false)
    expect(evaluate('-a -b', ctx({ filePatterns: facts('b') }))).toBe(false)
    expect(evaluate('-a -b', ctx({ filePatterns: facts('c') }))).toBe(true)
  })

  it('excludes a file tagged in frontmatter', () => {
    expect(evaluate('-tag:foo', ctx({
      frontmatter: { tags: ['foo'] },
      filePatterns: facts(),
    }))).toBe(false)
  })

  it('excludes a file with an inline tag found anywhere', () => {
    expect(evaluate('-tag:foo', ctx({
      frontmatter: {},
      filePatterns: facts('#foo'),
    }))).toBe(false)
    expect(evaluate('-tag:foo', ctx({
      frontmatter: {},
      filePatterns: facts(),
    }))).toBe(true)
  })

  it('excludes a file by frontmatter title', () => {
    expect(evaluate('-title:Meeting', ctx({
      frontmatter: { title: 'Meeting notes' },
      filePatterns: facts(),
    }))).toBe(false)
  })

  it('does not exclude a file that matches the positive side of an OR', () => {
    expect(evaluate('foo OR -bar', ctx({
      bodyTokens: new Set(['foo']),
      filePatterns: facts('bar'),
    }))).toBe(true)
  })
})

describe('buildSearchResult with whole-file facts', () => {

  const textResult: SearchResult = {
    filePath: '/vault/note.md',
    matches: [{ lineNumber: 1, lineText: 'foo', matchedText: 'foo' }],
    totalMatches: 1,
  }

  it('drops the file when the negated word occurs elsewhere', () => {
    const ast = tryParse('foo -bar')!
    expect(buildSearchResult(textResult, {}, ast, undefined, undefined, facts('bar'))).toBeNull()
  })

  it('keeps the file when the negated word is absent', () => {
    const ast = tryParse('foo -bar')!
    const result = buildSearchResult(textResult, {}, ast, undefined, undefined, facts())
    expect(result).not.toBeNull()
    expect(result!.filePath).toBe('/vault/note.md')
  })
})
