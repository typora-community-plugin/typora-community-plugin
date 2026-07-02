import { describe, it, expect } from '@jest/globals'
import { TitleSyntaxHandler } from './title-syntax'
import type { FieldNode, EvalContext } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────

function fieldNode(pattern: string): FieldNode {
  return { type: 'field', field: 'title', pattern }
}

function makeCtx(overrides: Partial<EvalContext> = {}): EvalContext {
  return {
    bodyTokens: new Set<string>(),
    frontmatter: {},
    ...overrides,
  } as EvalContext
}

// ── name ────────────────────────────────────────────────────────────────

describe('name', () => {
  it('is "title"', () => {
    expect(TitleSyntaxHandler.name).toBe('title')
  })
})

// ── tryParse ────────────────────────────────────────────────────────────

describe('tryParse', () => {
  it('returns a FieldNode with type "field"', () => {
    const node = TitleSyntaxHandler.tryParse('meeting')
    expect(node!.type).toBe('field')
  })

  it('sets field to "title"', () => {
    const node = TitleSyntaxHandler.tryParse('weekly review')
    expect(node!.field).toBe('title')
  })

  it('stores the value as pattern', () => {
    const node = TitleSyntaxHandler.tryParse('project kickoff')
    expect(node!.pattern).toBe('project kickoff')
  })

  it('handles empty string value', () => {
    const node = TitleSyntaxHandler.tryParse('')
    expect(node!.pattern).toBe('')
  })
})

// ── extractSearchText ───────────────────────────────────────────────────

describe('extractSearchText', () => {
  it('always returns null', () => {
    expect(TitleSyntaxHandler.extractSearchText(fieldNode('meeting'))).toBeNull()
  })
})

// ── evaluate ────────────────────────────────────────────────────────────

describe('evaluate', () => {
  describe('frontmatter.title', () => {
    it('returns true when frontmatter title contains the pattern', () => {
      const node = fieldNode('meeting')
      const ctx = makeCtx({ frontmatter: { title: 'Weekly team meeting' } })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns true when frontmatter title exactly equals the pattern', () => {
      const node = fieldNode('Notes')
      const ctx = makeCtx({ frontmatter: { title: 'Notes' } })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns false when frontmatter title does not contain the pattern', () => {
      const node = fieldNode('review')
      const ctx = makeCtx({ frontmatter: { title: 'Weekly meeting' } })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when frontmatter.title is undefined', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: {} })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when frontmatter.title is null', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: { title: null } })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when frontmatter.title is empty string', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: { title: '' } })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('handles numeric frontmatter title via String coercion', () => {
      const node = fieldNode('42')
      const ctx = makeCtx({ frontmatter: { title: 42 } })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })
  })

  describe('titles (markdown headings)', () => {
    it('returns true when a heading name contains the pattern', () => {
      const node = fieldNode('Introduction')
      const ctx = makeCtx({
        frontmatter: {},
        titles: [
          { name: 'Introduction', lineText: '# Introduction', lineNumber: 5 },
          { name: 'Details', lineText: '## Details', lineNumber: 10 },
        ],
      })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns true when pattern matches substring of heading name', () => {
      const node = fieldNode('Detail')
      const ctx = makeCtx({
        frontmatter: {},
        titles: [
          { name: 'Implementation Details', lineText: '## Implementation Details', lineNumber: 10 },
        ],
      })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns false when no heading matches', () => {
      const node = fieldNode('Conclusion')
      const ctx = makeCtx({
        frontmatter: {},
        titles: [
          { name: 'Introduction', lineText: '# Introduction', lineNumber: 5 },
        ],
      })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when titles array is empty', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({
        frontmatter: {},
        titles: [],
      })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when titles is undefined', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: {} })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })
  })

  describe('combined', () => {
    it('short-circuits on frontmatter title match', () => {
      const node = fieldNode('meeting')
      const ctx = makeCtx({
        frontmatter: { title: 'team meeting' },
        titles: [
          { name: 'notes', lineText: '# notes', lineNumber: 5 },
        ],
      })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('falls through to titles when frontmatter title does not match', () => {
      const node = fieldNode('Meeting Notes')
      const ctx = makeCtx({
        frontmatter: { title: 'some other title' },
        titles: [
          { name: 'Meeting Notes', lineText: '# Meeting Notes', lineNumber: 5 },
        ],
      })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns false when neither frontmatter title nor headings match', () => {
      const node = fieldNode('missing')
      const ctx = makeCtx({
        frontmatter: { title: 'some title' },
        titles: [
          { name: 'some heading', lineText: '# some heading', lineNumber: 5 },
        ],
      })
      expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })
  })

  it('matches empty pattern against non-empty frontmatter title', () => {
    const node = fieldNode('')
    const ctx = makeCtx({ frontmatter: { title: 'anything' } })
    expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('matches empty pattern against non-empty heading name', () => {
    const node = fieldNode('')
    const ctx = makeCtx({
      frontmatter: {},
      titles: [{ name: 'Heading', lineText: '# Heading', lineNumber: 1 }],
    })
    expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })
})

// ── collectFieldMatches ─────────────────────────────────────────────────

describe('collectFieldMatches', () => {
  describe('frontmatter.title', () => {
    it('returns a match when frontmatter title contains the pattern', () => {
      const node = fieldNode('meeting')
      const ctx = makeCtx({ frontmatter: { title: 'Weekly team meeting' } })
      const matches = TitleSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches).toHaveLength(1)
      expect(matches[0].lineNumber).toBe(0)
      expect(matches[0].lineText).toBe('title: Weekly team meeting')
      expect(matches[0].matchedText).toBe('meeting')
      expect(matches[0].source).toBe('field:title')
    })

    it('returns empty array when frontmatter title does not contain the pattern', () => {
      const node = fieldNode('review')
      const ctx = makeCtx({ frontmatter: { title: 'Weekly meeting' } })
      expect(TitleSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })

    it('returns empty array when frontmatter.title is undefined', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: {} })
      expect(TitleSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })

    it('handles numeric frontmatter title via String coercion', () => {
      const node = fieldNode('42')
      const ctx = makeCtx({ frontmatter: { title: 42 } })
      const matches = TitleSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches).toHaveLength(1)
      expect(matches[0].lineText).toBe('title: 42')
    })

    it('handles null frontmatter title', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: { title: null } })
      expect(TitleSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })
  })

  describe('titles (markdown headings)', () => {
    it('returns matches for each heading containing the pattern', () => {
      const node = fieldNode('Section')
      const ctx = makeCtx({
        frontmatter: {},
        titles: [
          { name: 'Section 1', lineText: '# Section 1', lineNumber: 5 },
          { name: 'Overview', lineText: '## Overview', lineNumber: 8 },
          { name: 'Section 2', lineText: '## Section 2', lineNumber: 12 },
        ],
      })
      const matches = TitleSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches).toHaveLength(2)
      expect(matches[0].lineNumber).toBe(5)
      expect(matches[0].lineText).toBe('# Section 1')
      expect(matches[0].matchedText).toBe('Section 1')
      expect(matches[1].lineNumber).toBe(12)
      expect(matches[1].matchedText).toBe('Section 2')
    })

    it('returns empty array when no headings match', () => {
      const node = fieldNode('missing')
      const ctx = makeCtx({
        frontmatter: {},
        titles: [
          { name: 'Introduction', lineText: '# Introduction', lineNumber: 5 },
        ],
      })
      expect(TitleSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })

    it('returns empty array when titles is undefined', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: {} })
      expect(TitleSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })

    it('returns empty array when titles is empty array', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: {}, titles: [] })
      expect(TitleSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })
  })

  describe('combined', () => {
    it('collects matches from both frontmatter title and headings', () => {
      const node = fieldNode('meeting')
      const ctx = makeCtx({
        frontmatter: { title: 'team meeting' },
        titles: [
          { name: 'daily meeting recap', lineText: '# daily meeting recap', lineNumber: 5 },
          { name: 'Action Items', lineText: '## Action Items', lineNumber: 10 },
        ],
      })
      const matches = TitleSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches).toHaveLength(2)
      expect(matches[0].lineNumber).toBe(0)
      expect(matches[0].lineText).toBe('title: team meeting')
      expect(matches[1].lineNumber).toBe(5)
      expect(matches[1].lineText).toBe('# daily meeting recap')
    })

    it('all matches have correct source', () => {
      const node = fieldNode('project')
      const ctx = makeCtx({
        frontmatter: { title: 'project overview' },
        titles: [
          { name: 'Project Setup', lineText: '# Project Setup', lineNumber: 3 },
        ],
      })
      const matches = TitleSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches.every(m => m.source === 'field:title')).toBe(true)
    })
  })
})
