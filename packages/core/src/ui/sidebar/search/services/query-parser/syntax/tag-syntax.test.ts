import { describe, it, expect } from '@jest/globals'
import { TagSyntaxHandler } from './tag-syntax'
import type { FieldNode, EvalContext } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────

function fieldNode(pattern: string): FieldNode {
  return { type: 'field', field: 'tag', pattern }
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
  it('is "tag"', () => {
    expect(TagSyntaxHandler.name).toBe('tag')
  })
})

// ── tryParse ────────────────────────────────────────────────────────────

describe('tryParse', () => {
  it('returns a FieldNode with type "field"', () => {
    const node = TagSyntaxHandler.tryParse('foo')
    expect(node!.type).toBe('field')
  })

  it('sets field to "tag"', () => {
    const node = TagSyntaxHandler.tryParse('#mytag')
    expect(node!.field).toBe('tag')
  })

  it('stores the value as pattern', () => {
    const node = TagSyntaxHandler.tryParse('project')
    expect(node!.pattern).toBe('project')
  })

  it('preserves # prefix when present', () => {
    const node = TagSyntaxHandler.tryParse('#foo')
    expect(node!.pattern).toBe('#foo')
  })

  it('handles empty string value', () => {
    const node = TagSyntaxHandler.tryParse('')
    expect(node!.pattern).toBe('')
  })
})

// ── extractSearchText ───────────────────────────────────────────────────

describe('extractSearchText', () => {
  it('prepends # to the pattern', () => {
    const node = fieldNode('foo')
    expect(TagSyntaxHandler.extractSearchText(node)).toBe('#foo')
  })

  it('preserves existing # prefix', () => {
    const node = fieldNode('#bar')
    expect(TagSyntaxHandler.extractSearchText(node)).toBe('##bar')
  })

  it('handles empty pattern', () => {
    const node = fieldNode('')
    expect(TagSyntaxHandler.extractSearchText(node)).toBe('#')
  })
})

// ── evaluate ────────────────────────────────────────────────────────────

describe('evaluate', () => {
  describe('frontmatter tags - array', () => {
    it('returns true when pattern matches a tag in frontmatter array (exact)', () => {
      const node = fieldNode('project')
      const ctx = makeCtx({ frontmatter: { tags: ['work', 'project', 'docs'] } })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns false when pattern does not match any tag (exact only)', () => {
      const node = fieldNode('project')
      const ctx = makeCtx({ frontmatter: { tags: ['my-project', 'work'] } })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when frontmatter tags array is empty', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: { tags: [] } })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })
  })

  describe('frontmatter tags - string', () => {
    it('returns true when single string tag matches exactly', () => {
      const node = fieldNode('personal')
      const ctx = makeCtx({ frontmatter: { tags: 'personal' } })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns false when single string tag does not match', () => {
      const node = fieldNode('work')
      const ctx = makeCtx({ frontmatter: { tags: 'personal' } })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })
  })

  describe('frontmatter tags - missing', () => {
    it('returns false when frontmatter.tags is undefined', () => {
      const node = fieldNode('foo')
      const ctx = makeCtx({ frontmatter: {} })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when frontmatter itself is empty', () => {
      const node = fieldNode('foo')
      const ctx = makeCtx({})
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })
  })

  describe('inline tags', () => {
    it('returns true when inline tag matches (case-insensitive)', () => {
      const node = fieldNode('FooBar')
      const ctx = makeCtx({
        frontmatter: {},
        inlineTags: new Set(['foobar', 'other']),
      })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns true when case differs for both pattern and tag', () => {
      const node = fieldNode('MYTAG')
      const ctx = makeCtx({
        frontmatter: {},
        inlineTags: new Set(['mytag']),
      })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('returns false when inline tag is substring but not exact', () => {
      const node = fieldNode('tag')
      const ctx = makeCtx({
        frontmatter: {},
        inlineTags: new Set(['mytag', 'tagged']),
      })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when inlineTags is empty', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({
        frontmatter: {},
        inlineTags: new Set(),
      })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })

    it('returns false when inlineTags is undefined', () => {
      const node = fieldNode('anything')
      const ctx = makeCtx({ frontmatter: {} })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
    })
  })

  describe('combined', () => {
    it('short-circuits on frontmatter match without checking inline', () => {
      const node = fieldNode('work')
      const ctx = makeCtx({
        frontmatter: { tags: ['work'] },
        inlineTags: new Set(['work']),
      })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })

    it('falls through to inline tags when frontmatter does not match', () => {
      const node = fieldNode('inlineonly')
      const ctx = makeCtx({
        frontmatter: { tags: ['frontmatter'] },
        inlineTags: new Set(['inlineonly']),
      })
      expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)
    })
  })
})

// ── collectFieldMatches ─────────────────────────────────────────────────

describe('collectFieldMatches', () => {
  describe('frontmatter tags - array', () => {
    it('returns match for each matching tag', () => {
      const node = fieldNode('project')
      const ctx = makeCtx({ frontmatter: { tags: ['work', 'project'] } })
      const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe('project')
      expect(matches[0].source).toBe('field:tag')
    })

    it('returns multiple matches when tag appears multiple times', () => {
      const node = fieldNode('dup')
      const ctx = makeCtx({ frontmatter: { tags: ['dup', 'other', 'dup'] } })
      const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches).toHaveLength(2)
    })

    it('returns matches with default lineNumber and lineText when no context.tags', () => {
      const node = fieldNode('project')
      const ctx = makeCtx({ frontmatter: { tags: ['work', 'project'] } })
      const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches[0].lineNumber).toBe(0)
      expect(matches[0].lineText).toBe('tag: project')
    })

    it('uses context.tags positional info when available', () => {
      const node = fieldNode('project')
      const ctx = makeCtx({
        frontmatter: { tags: ['work', 'project'] },
        tags: [
          { tag: 'work', lineNumber: 3, lineText: '  - work' },
          { tag: 'project', lineNumber: 4, lineText: '  - project' },
        ],
      })
      const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches[0].lineNumber).toBe(4)
      expect(matches[0].lineText).toBe('  - project')
    })

    it('returns empty array when no tags match', () => {
      const node = fieldNode('missing')
      const ctx = makeCtx({ frontmatter: { tags: ['work', 'project'] } })
      expect(TagSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })
  })

  describe('frontmatter tags - string', () => {
    it('returns single match when string tag matches', () => {
      const node = fieldNode('personal')
      const ctx = makeCtx({ frontmatter: { tags: 'personal' } })
      const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe('personal')
      expect(matches[0].lineNumber).toBe(0)
      expect(matches[0].lineText).toBe('tag: personal')
    })

    it('uses context.tags[0] positional info when available', () => {
      const node = fieldNode('personal')
      const ctx = makeCtx({
        frontmatter: { tags: 'personal' },
        tags: [{ tag: 'personal', lineNumber: 5, lineText: 'personal' }],
      })
      const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)

      expect(matches[0].lineNumber).toBe(5)
      expect(matches[0].lineText).toBe('personal')
    })

    it('returns empty array when string tag does not match', () => {
      const node = fieldNode('work')
      const ctx = makeCtx({ frontmatter: { tags: 'personal' } })
      expect(TagSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })
  })

  describe('frontmatter tags - missing', () => {
    it('returns empty array when frontmatter.tags is undefined', () => {
      const node = fieldNode('foo')
      const ctx = makeCtx({ frontmatter: {} })
      expect(TagSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
    })
  })

  it('does not match inline tags in collectFieldMatches', () => {
    const node = fieldNode('inlineonly')
    const ctx = makeCtx({
      frontmatter: {},
      inlineTags: new Set(['inlineonly']),
    })
    expect(TagSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
  })
})
