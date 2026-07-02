import { describe, it, expect } from '@jest/globals'
import { tryParseBareword, evaluateTerm } from './bareword-syntax'
import type { TermNode, EvalContext } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<EvalContext> = {}): EvalContext {
  return {
    bodyTokens: new Set<string>(),
    frontmatter: {},
    ...overrides,
  } as EvalContext
}

// ── tryParseBareword ────────────────────────────────────────────────────

describe('tryParseBareword', () => {

  it('returns a TermNode with type "term"', () => {
    const node = tryParseBareword('hello', false)
    expect(node.type).toBe('term')
  })

  it('stores the value as pattern', () => {
    const node = tryParseBareword('my-pattern', false)
    expect(node.pattern).toBe('my-pattern')
  })

  it('sets isQuoted based on input', () => {
    expect(tryParseBareword('hello', true).isQuoted).toBe(true)
    expect(tryParseBareword('hello', false).isQuoted).toBe(false)
  })

  it('handles quoted phrases preserving spaces in pattern', () => {
    const node = tryParseBareword('hello world', true)
    expect(node.pattern).toBe('hello world')
  })

  it('works with empty string value', () => {
    const node = tryParseBareword('', false)
    expect(node.type).toBe('term')
    expect(node.pattern).toBe('')
  })
})

// ── evaluateTerm: bare words ───────────────────────────────────────────

describe('evaluateTerm — bare word', () => {

  function termNode(pattern: string): TermNode {
    return { type: 'term', pattern, isQuoted: false }
  }

  it('returns true when bodyTokens contains the lowercase pattern', () => {
    // The function lowercases the pattern, then checks bodyTokens.has(pattern)
    // bodyTokens must contain the lowercase version of the word
    const node = termNode('HELLO')  // will be lowercased to 'hello' in evaluateTerm
    const ctx = makeCtx({ bodyTokens: new Set(['hello', 'other']) })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('matches case-insensitively by lowering pattern', () => {
    const node = termNode('Hello')  // lowercased to 'hello'
    const ctx = makeCtx({ bodyTokens: new Set(['hello', 'world']) })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('returns false when bodyTokens does not contain the pattern', () => {
    const node = termNode('missing')
    const ctx = makeCtx({ bodyTokens: new Set(['hello', 'world']) })
    expect(evaluateTerm(node, ctx)).toBe(false)
  })

  it('falls back to rawLines when bare word not in bodyTokens', () => {
    const node = termNode('unique-phrase')
    const ctx = makeCtx({
      bodyTokens: new Set(['other']),
      rawLines: ['this line has unique-phrase in it'],
    })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('returns false when pattern is not in bodyTokens or rawLines', () => {
    const node = termNode('nowhere')
    const ctx = makeCtx({
      bodyTokens: new Set(['hello']),
      rawLines: ['no match here at all'],
    })
    expect(evaluateTerm(node, ctx)).toBe(false)
  })

  it('handles patterns with special characters via rawLines fallback', () => {
    const node = termNode('$100')
    const ctx = makeCtx({
      bodyTokens: new Set(['other']),
      rawLines: ['The price is $100 today'],
    })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('does not use rawLines when bodyTokens has a match', () => {
    const node = termNode('found')
    const ctx = makeCtx({
      bodyTokens: new Set(['found']),
      rawLines: ['raw line without found pattern'],
    })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })
})

// ── evaluateTerm: quoted phrases ───────────────────────────────────────

describe('evaluateTerm — quoted phrase', () => {

  function termNode(pattern: string): TermNode {
    return { type: 'term', pattern, isQuoted: true }
  }

  it('returns true when any bodyToken includes the lowercase phrase', () => {
    // The function lowercases the entire quoted phrase pattern
    const node = termNode('HELLO WORLD')  // lowercased to 'hello world'
    const ctx = makeCtx({ bodyTokens: new Set(['something hello world something else']) })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('is case-insensitive for quoted phrases in rawLines', () => {
    const node = termNode('Hello World')  // lowercased to 'hello world'
    const ctx = makeCtx({
      bodyTokens: new Set(),
      rawLines: ['this line has hello world phrase on it'],
    })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('returns false when no bodyToken contains the phrase', () => {
    const node = termNode('not in any token')
    const ctx = makeCtx({ bodyTokens: new Set(['hello', 'world']) })
    expect(evaluateTerm(node, ctx)).toBe(false)
  })

  it('falls back to rawLines when phrase not found in bodyTokens', () => {
    const node = termNode('exact match phrase')
    const ctx = makeCtx({
      bodyTokens: new Set(['separated tokens']),
      rawLines: ['this has exact match phrase on one line'],
    })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('returns false when quote not in bodyTokens or rawLines', () => {
    const node = termNode('definitely not here')
    const ctx = makeCtx({
      bodyTokens: new Set(['hello world']),
      rawLines: ['no matching line either'],
    })
    expect(evaluateTerm(node, ctx)).toBe(false)
  })

  it('handles empty pattern', () => {
    const node = termNode('')
    const ctx = makeCtx({ bodyTokens: new Set(['anything']) })
    // Empty string is included by any string (includes(''))
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('uses rawLines even when bodyTokens is empty', () => {
    const node = termNode('search phrase')
    const ctx = makeCtx({
      bodyTokens: new Set(),
      rawLines: ['the search phrase appears here'],
    })
    expect(evaluateTerm(node, ctx)).toBe(true)
  })

  it('returns false with no rawLines provided', () => {
    const node = termNode('missing')
    const ctx = makeCtx({ bodyTokens: new Set(['other']) })
    expect(evaluateTerm(node, ctx)).toBe(false)
  })
})
