/**
 * Negation analysis over the query AST — which patterns need a whole-file scan,
 * and when the positive search alone cannot answer the query.
 */

import { describe, it, expect } from '@jest/globals'

import { tryParse } from 'src/ui/sidebar/search/services/query-parser'
import {
  collectNegationPatterns,
  astHasBodyNegation,
  astHasNegatedTerm,
  astHasNegationUnderOr,
} from 'src/ui/sidebar/search/services/query-parser/negation'

function patterns(query: string): string[] {
  const ast = tryParse(query)
  expect(ast).not.toBeNull()
  return collectNegationPatterns(ast!)
}

function needsBody(query: string): boolean {
  const ast = tryParse(query)
  expect(ast).not.toBeNull()
  return astHasBodyNegation(ast!)
}

function hasNegatedTerm(query: string): boolean {
  const ast = tryParse(query)
  expect(ast).not.toBeNull()
  return astHasNegatedTerm(ast!)
}

function negUnderOr(query: string): boolean {
  const ast = tryParse(query)
  expect(ast).not.toBeNull()
  return astHasNegationUnderOr(ast!)
}

describe('collectNegationPatterns', () => {

  it('collects a single negated word', () => {
    expect(patterns('foo -bar')).toEqual(['bar'])
  })

  it('collects several negated words in order', () => {
    expect(patterns('a -b -c')).toEqual(['b', 'c'])
  })

  it('collects every term of a negated group', () => {
    expect(patterns('-(a OR b)')).toEqual(['a', 'b'])
    expect(patterns('-(a b)')).toEqual(['a', 'b'])
  })

  it('uses the text form of a negated tag', () => {
    expect(patterns('-tag:foo')).toEqual(['#foo'])
  })

  it('skips metadata-only fields', () => {
    expect(patterns('-title:foo')).toEqual([])
    expect(patterns('-filename:foo')).toEqual([])
  })

  it('finds negations nested inside OR groups', () => {
    expect(patterns('a OR -b')).toEqual(['b'])
  })

  it('deduplicates repeated patterns', () => {
    expect(patterns('-a -a')).toEqual(['a'])
  })
})

describe('astHasBodyNegation', () => {

  it('is false for a plain query', () => {
    expect(needsBody('foo bar')).toBe(false)
  })

  it('is true for a negated word', () => {
    expect(needsBody('foo -bar')).toBe(true)
  })

  it('is true for a negated tag (inline tags live in the body)', () => {
    expect(needsBody('-tag:foo')).toBe(true)
  })

  it('is false for metadata-only negations', () => {
    expect(needsBody('-title:foo')).toBe(false)
    expect(needsBody('-filename:foo')).toBe(false)
  })
})

describe('astHasNegationUnderOr', () => {

  it('is false for a conjunctive negation', () => {
    expect(negUnderOr('foo -bar')).toBe(false)
    expect(negUnderOr('-(a OR b)')).toBe(false)
  })

  it('is true when a negation is an OR branch', () => {
    expect(negUnderOr('foo OR -bar')).toBe(true)
    expect(negUnderOr('(a OR -b)')).toBe(true)
    expect(negUnderOr('a OR (b -c)')).toBe(true)
  })

  it('is false for a plain OR', () => {
    expect(negUnderOr('foo OR bar')).toBe(false)
  })
})

describe('astHasNegatedTerm', () => {

  it('is false for negated metadata-only fields', () => {
    expect(hasNegatedTerm('-tag:foo')).toBe(false)
    expect(hasNegatedTerm('-title:foo')).toBe(false)
  })

  it('is true for a negated plain word, including inside groups', () => {
    expect(hasNegatedTerm('foo -bar')).toBe(true)
    expect(hasNegatedTerm('-(a OR b)')).toBe(true)
    expect(hasNegatedTerm('a OR -b')).toBe(true)
  })

  it('is false for positive-only queries', () => {
    expect(hasNegatedTerm('foo tag:bar')).toBe(false)
  })
})
