import { describe, it, expect } from '@jest/globals'
import { FilenameSyntaxHandler } from './filename-syntax'
import type { FieldNode, EvalContext } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────

function fieldNode(pattern: string): FieldNode {
  return { type: 'field', field: 'filename', pattern }
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
  it('is "filename"', () => {
    expect(FilenameSyntaxHandler.name).toBe('filename')
  })
})

// ── tryParse ────────────────────────────────────────────────────────────

describe('tryParse', () => {
  it('returns a FieldNode with type "field"', () => {
    const node = FilenameSyntaxHandler.tryParse('doc')
    expect(node!.type).toBe('field')
  })

  it('sets field to "filename"', () => {
    const node = FilenameSyntaxHandler.tryParse('README')
    expect(node!.field).toBe('filename')
  })

  it('stores the value as pattern', () => {
    const node = FilenameSyntaxHandler.tryParse('my-file')
    expect(node!.pattern).toBe('my-file')
  })

  it('handles empty string value', () => {
    const node = FilenameSyntaxHandler.tryParse('')
    expect(node!.pattern).toBe('')
  })

  it('preserves spaces in pattern', () => {
    const node = FilenameSyntaxHandler.tryParse('project report')
    expect(node!.pattern).toBe('project report')
  })
})

// ── extractSearchText ───────────────────────────────────────────────────

describe('extractSearchText', () => {
  it('always returns null', () => {
    expect(FilenameSyntaxHandler.extractSearchText(fieldNode('doc'))).toBeNull()
  })
})

// ── evaluate ────────────────────────────────────────────────────────────

describe('evaluate', () => {
  it('returns true when filename contains the pattern (case-insensitive)', () => {
    const node = fieldNode('doc')
    const ctx = makeCtx({ filePath: '/vault/My Document.md' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('returns false when filename does not contain the pattern', () => {
    const node = fieldNode('readme')
    const ctx = makeCtx({ filePath: '/vault/NOTES.md' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(false)
  })

  it('returns false when filePath is absent', () => {
    const node = fieldNode('anything')
    const ctx = makeCtx({})
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(false)
  })

  it('returns false when filePath is undefined', () => {
    const node = fieldNode('anything')
    const ctx = makeCtx({ filePath: undefined })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(false)
  })

  it('matches against basename only, not full path', () => {
    const node = fieldNode('doc')
    const ctx = makeCtx({ filePath: '/some/doc/path/file.md' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(false)
  })

  it('handles Windows-style paths', () => {
    const node = fieldNode('report')
    const ctx = makeCtx({ filePath: 'C:\\Users\\user\\Q1 Report.md' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('handles filenames without extension', () => {
    const node = fieldNode('LICENSE')
    const ctx = makeCtx({ filePath: '/vault/LICENSE' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('handles patterns with special characters', () => {
    const node = fieldNode('2024')
    const ctx = makeCtx({ filePath: '/vault/Report-2024.md' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('matches empty pattern against any filename', () => {
    const node = fieldNode('')
    const ctx = makeCtx({ filePath: '/vault/anything.md' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('is fully case-insensitive for both pattern and filename', () => {
    const node = fieldNode('HELLO')
    const ctx = makeCtx({ filePath: '/vault/hello.md' })
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })
})

// ── collectFieldMatches ─────────────────────────────────────────────────

describe('collectFieldMatches', () => {
  it('returns a match object when filePath is present', () => {
    const node = fieldNode('doc')
    const ctx = makeCtx({ filePath: '/vault/My Document.md' })
    const matches = FilenameSyntaxHandler.collectFieldMatches(node, ctx)

    expect(matches).toHaveLength(1)
    expect(matches[0].lineNumber).toBe(0)
    expect(matches[0].lineText).toBe('filename: My Document.md')
    expect(matches[0].matchedText).toBe('doc')
    expect(matches[0].source).toBe('field:filename')
  })

  it('returns empty array when filePath is absent', () => {
    const node = fieldNode('anything')
    const ctx = makeCtx({})
    expect(FilenameSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
  })

  it('returns empty array when filePath is undefined', () => {
    const node = fieldNode('anything')
    const ctx = makeCtx({ filePath: undefined })
    expect(FilenameSyntaxHandler.collectFieldMatches(node, ctx)).toHaveLength(0)
  })

  it('uses basename only in lineText', () => {
    const node = fieldNode('test')
    const ctx = makeCtx({ filePath: '/deep/nested/path/test-file.md' })
    const matches = FilenameSyntaxHandler.collectFieldMatches(node, ctx)

    expect(matches[0].lineText).toBe('filename: test-file.md')
  })

  it('preserves the original pattern in matchedText', () => {
    const node = fieldNode('MyPattern')
    const ctx = makeCtx({ filePath: '/vault/mypattern.md' })
    const matches = FilenameSyntaxHandler.collectFieldMatches(node, ctx)

    expect(matches[0].matchedText).toBe('MyPattern')
  })
})
