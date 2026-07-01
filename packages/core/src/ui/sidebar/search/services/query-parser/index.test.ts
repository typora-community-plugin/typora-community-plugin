/**
 * Minimal test set for the search query syntax.
 *
 * Covers:
 *   - tokenizer             raw tokenization (quotes, fields, negation)
 *   - tryParse / parse      AST construction from query strings
 *   - astHasFieldNodes      AST inspection helpers
 *   - syntax handlers       tag, title, filename — all lifecycle methods
 *   - extractTextTokenList  ripgrep token extraction
 *   - collectInlineTagPatterns  #tag position validation
 */

import { describe, it, expect } from '@jest/globals'

import { tokenize } from 'src/ui/sidebar/search/services/query-parser/tokenizer'
import type { RawToken } from 'src/ui/sidebar/search/services/query-parser/tokenizer'

import {
  tryParse,
  parse,
  astHasFieldNodes,
  astHasField,
} from 'src/ui/sidebar/search/services/query-parser'
import type { ParsedAST, FieldNode, AndNode, TermNode } from 'src/ui/sidebar/search/services/query-parser'

import { TagSyntaxHandler } from 'src/ui/sidebar/search/services/query-parser/syntax/tag-syntax'
import { TitleSyntaxHandler } from 'src/ui/sidebar/search/services/query-parser/syntax/title-syntax'
import { FilenameSyntaxHandler } from 'src/ui/sidebar/search/services/query-parser/syntax/filename-syntax'

import { collectInlineTagPatterns, evaluateAST } from 'src/ui/sidebar/search/services/result-builder'
import type { SearchMatch } from 'src/ui/sidebar/search/services/text-search-service'

// ── Helpers ─────────────────────────────────────────────────────────────

function stripPos(node: ParsedAST): ParsedAST {
  return JSON.parse(JSON.stringify(node))
}

function t(value: string, isQuoted = false, isNegated = false): RawToken {
  return { value, isField: false, isQuoted, isNegated }
}

function ft(value: string, field: string, isNegated = false): RawToken {
  return { value, field: field as any, isField: true, isQuoted: false, isNegated }
}

// ── Tokenizer ───────────────────────────────────────────────────────────

describe('tokenizer', () => {

  it('bare words', () => {
    expect(tokenize('hello')).toEqual([t('hello')])
    expect(tokenize('hello world')).toEqual([t('hello'), t('world')])
    expect(tokenize('  spaced  ')).toEqual([t('spaced')])
  })

  it('quoted phrases', () => {
    expect(tokenize('"exact phrase"')).toEqual([t('exact phrase', true)])
    expect(tokenize('hello "exact phrase"')).toEqual([t('hello'), t('exact phrase', true)])
  })

  it('unterminated quote treated as bare word', () => {
    const result = tokenize('"unterminated')
    expect(result).toHaveLength(1)
    expect(result[0].isQuoted).toBe(false)
    expect(result[0].value).toBe('unterminated')
  })

  it('field prefixes (case-insensitive)', () => {
    expect(tokenize('tag:foo')).toEqual([ft('foo', 'tag')])
    // Note: tokenizer field regex (\w+?:) stops at whitespace, so quoted values
    // are split: Title:"my heading" → field "title" with value '"my' + bare 'heading"'
    expect(tokenize('Title:my_heading')).toEqual([ft('my_heading', 'title', false)])
    expect(tokenize('FILENAME:test')).toEqual([ft('test', 'filename')])
  })

  it('negation', () => {
    expect(tokenize('-tag:foo')).toEqual([ft('foo', 'tag', true)])
    expect(tokenize('-hello')).toEqual([t('hello', false, true)])
    expect(tokenize('hello -world')).toEqual([t('hello'), t('world', false, true)])
  })

  it('complex query', () => {
    const result = tokenize('tag:#foo "project notes" -title:bar')
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual(ft('#foo', 'tag'))
    expect(result[1]).toEqual(t('project notes', true))
    expect(result[2]).toEqual(ft('bar', 'title', true))
  })
})

// ── Parser: tryParse ───────────────────────────────────────────────────

describe('tryParse', () => {

  it('empty / whitespace returns null', () => {
    expect(tryParse('')).toBeNull()
    expect(tryParse('   ')).toBeNull()
  })

  it('single bare word returns TermNode (treated as structured)', () => {
    const ast = tryParse('hello')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('term')
    expect((ast as TermNode).pattern).toBe('hello')
  })

  it('multiple bare words returns AND of TermNodes', () => {
    const ast = tryParse('hello world')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('and')
    const and = ast as AndNode
    expect(and.children).toHaveLength(2)
    expect(and.children.every(c => c.type === 'term')).toBe(true)
  })

  it('single field prefix returns FieldNode', () => {
    const ast = tryParse('tag:foo')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('field')
    expect((ast as FieldNode).field).toBe('tag')
    expect((ast as FieldNode).pattern).toBe('foo')
  })

  it('field + bare word returns AND node', () => {
    const ast = tryParse('tag:foo Title')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('and')
    const and = ast as AndNode
    expect(and.children).toHaveLength(2)
    expect(and.children[0].type).toBe('field')
    expect(and.children[1].type).toBe('term')
  })

  it('quoted phrase returns TermNode', () => {
    const ast = tryParse('"hello world"')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('term')
    expect((ast as TermNode).pattern).toBe('hello world')
    expect((ast as TermNode).isQuoted).toBe(true)
  })

  it('multiple field nodes', () => {
    const ast = tryParse('tag:foo title:bar')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('and')
    const and = ast as AndNode
    expect(and.children).toHaveLength(2)
    expect(and.children.every(c => c.type === 'field')).toBe(true)
  })

  it('negated field', () => {
    const ast = tryParse('-tag:foo')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('not')
  })

  it('negated bare word in structured query', () => {
    const ast = tryParse('tag:foo -bar')
    expect(ast).not.toBeNull()
    expect(ast!.type).toBe('and')
    const and = ast as AndNode
    expect(and.children).toHaveLength(2)
    expect(and.children[1].type).toBe('not')
  })
})

// ── Parser: parse (always returns AST) ─────────────────────────────────

describe('parse', () => {

  it('pure text fallback builds AND of bare words', () => {
    const ast = parse('hello world')
    expect(ast).not.toBeNull()
    expect(ast.type).toBe('and')
    expect((ast as AndNode).children).toHaveLength(2)
  })

  it('single bare word returns TermNode', () => {
    const ast = parse('hello')
    expect(ast.type).toBe('term')
  })
})

// ── AST inspection helpers ─────────────────────────────────────────────

describe('astHasFieldNodes / astHasField', () => {

  it('astHasFieldNodes detects field nodes', () => {
    expect(astHasFieldNodes(tryParse('tag:foo')!)).toBe(true)
    expect(astHasFieldNodes(tryParse('tag:foo Title')!)).toBe(true)
    expect(astHasFieldNodes(tryParse('"hello"')!)).toBe(false)
    expect(astHasFieldNodes(parse('hello world'))).toBe(false)
  })

  it('astHasField detects specific field name', () => {
    expect(astHasField(tryParse('tag:foo')!, 'tag')).toBe(true)
    expect(astHasField(tryParse('tag:foo')!, 'title')).toBe(false)
    expect(astHasField(tryParse('tag:foo Title')!, 'tag')).toBe(true)
    expect(astHasField(tryParse('title:bar')!, 'title')).toBe(true)
    expect(astHasField(tryParse('title:bar')!, 'tag')).toBe(false)
  })
})

// ── TagSyntaxHandler ───────────────────────────────────────────────────

describe('TagSyntaxHandler', () => {

  it('tryParse produces FieldNode', () => {
    const node = TagSyntaxHandler.tryParse('#foo')
    expect(node).toEqual({ type: 'field', field: 'tag', pattern: '#foo' })

    const node2 = TagSyntaxHandler.tryParse('project')
    expect(node2).toEqual({ type: 'field', field: 'tag', pattern: 'project' })
  })

  it('extractSearchText emits #pattern', () => {
    const node = TagSyntaxHandler.tryParse('foo')!
    expect(TagSyntaxHandler.extractSearchText(node)).toBe('#foo')
  })

  it('evaluate checks frontmatter tags (array)', () => {
    const node = TagSyntaxHandler.tryParse('foo')!
    const ctx = { bodyTokens: new Set(), frontmatter: { tags: ['foo', 'bar'] } } as any
    expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)

    const ctxMiss = { bodyTokens: new Set(), frontmatter: { tags: ['baz'] } } as any
    expect(TagSyntaxHandler.evaluate(node, ctxMiss)).toBe(false)
  })

  it('evaluate checks frontmatter tags (string)', () => {
    const node = TagSyntaxHandler.tryParse('foo')!
    const ctx = { bodyTokens: new Set(), frontmatter: { tags: 'foo' } } as any
    expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('evaluate checks inline tags (body #tokens)', () => {
    const node = TagSyntaxHandler.tryParse('foo')!
    const ctx = { bodyTokens: new Set(), frontmatter: {}, inlineTags: new Set(['foo']) } as any
    expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(true)

    // Case-insensitive exact match for inline tags
    const ctxCase = { bodyTokens: new Set(), frontmatter: {}, inlineTags: new Set(['FOO']) } as any
    expect(TagSyntaxHandler.evaluate(node, ctxCase)).toBe(true)
  })

  it('evaluate requires exact match — rejects substring', () => {
    const node = TagSyntaxHandler.tryParse('foo')!

    // Should NOT match 'foo1' or 'my-foo' (substring)
    const ctxArray = { bodyTokens: new Set(), frontmatter: { tags: ['foo1', 'bar'] } } as any
    expect(TagSyntaxHandler.evaluate(node, ctxArray)).toBe(false)

    const ctxString = { bodyTokens: new Set(), frontmatter: { tags: 'my-foo' } } as any
    expect(TagSyntaxHandler.evaluate(node, ctxString)).toBe(false)

    // Should NOT match inline tag with extra chars (substring rejection for inline)
    const ctxInline = { bodyTokens: new Set(), frontmatter: {}, inlineTags: new Set(['foobar', 'baz']) } as any
    expect(TagSyntaxHandler.evaluate(node, ctxInline)).toBe(false)
  })

  it('evaluate supports hierarchical tags with / (exact match)', () => {
    const node = TagSyntaxHandler.tryParse('project/sub-tag')!

    // Should match exact hierarchical tag in array
    const ctxArray = { bodyTokens: new Set(), frontmatter: { tags: ['other', 'project/sub-tag'] } } as any
    expect(TagSyntaxHandler.evaluate(node, ctxArray)).toBe(true)

    // Should NOT match partial hierarchy
    const ctxPartial = { bodyTokens: new Set(), frontmatter: { tags: ['project/sub-tags', 'my-project/sub-tag'] } } as any
    expect(TagSyntaxHandler.evaluate(node, ctxPartial)).toBe(false)

    // Should match exact hierarchical string tag
    const ctxString = { bodyTokens: new Set(), frontmatter: { tags: 'project/sub-tag' } } as any
    expect(TagSyntaxHandler.evaluate(node, ctxString)).toBe(true)

    // Nested hierarchy with multiple slashes
    const nodeDeep = TagSyntaxHandler.tryParse('a/b/c/d')!
    const ctxDeep = { bodyTokens: new Set(), frontmatter: { tags: ['a/b/c/d'] } } as any
    expect(TagSyntaxHandler.evaluate(nodeDeep, ctxDeep)).toBe(true)

    // Should NOT match nested hierarchy if one segment differs
    const ctxDeepMiss = { bodyTokens: new Set(), frontmatter: { tags: ['a/b/c-e'] } } as any
    expect(TagSyntaxHandler.evaluate(nodeDeep, ctxDeepMiss)).toBe(false)
  })

  it('evaluate returns false when nothing matches', () => {
    const node = TagSyntaxHandler.tryParse('foo')!
    const ctx = { bodyTokens: new Set(), frontmatter: {}, inlineTags: new Set(['bar']) } as any
    expect(TagSyntaxHandler.evaluate(node, ctx)).toBe(false)
  })

  it('collectFieldMatches reads from TagObject lineText', () => {
    const node = TagSyntaxHandler.tryParse('A')!
    const ctx = {
      frontmatter: { tags: ['A', 'B'] },
      tags: [
        { name: 'A', lineText: '- A', lineNumber: 3 },
        { name: 'B', lineText: '- B', lineNumber: 4 },
      ],
    } as any

    const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)
    expect(matches).toHaveLength(1)
    expect(matches[0].lineText).toBe('- A')
    expect(matches[0].lineNumber).toBe(3)
    expect(matches[0].matchedText).toBe('A')
    expect(matches[0].source).toBe('field:tag')
  })

  it('collectFieldMatches falls back to synthetic text when TagObject absent', () => {
    const node = TagSyntaxHandler.tryParse('A')!
    const ctx = {
      frontmatter: { tags: ['A'] },
      // context.tags is undefined
    } as any

    const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)
    expect(matches).toHaveLength(1)
    expect(matches[0].lineText).toBe('tag: A')
    expect(matches[0].lineNumber).toBe(0)
  })

  it('collectFieldMatches handles string format tags: meeting', () => {
    const node = TagSyntaxHandler.tryParse('meeting')!
    const ctx = {
      frontmatter: { tags: 'meeting' },
      tags: [{ name: 'meeting', lineText: 'tags: meeting', lineNumber: 2 }],
    } as any

    const matches = TagSyntaxHandler.collectFieldMatches(node, ctx)
    expect(matches).toHaveLength(1)
    expect(matches[0].lineText).toBe('tags: meeting')
    expect(matches[0].lineNumber).toBe(2)
  })
})

// ── TitleSyntaxHandler ─────────────────────────────────────────────────

describe('TitleSyntaxHandler', () => {

  it('tryParse produces FieldNode', () => {
    const node = TitleSyntaxHandler.tryParse('meeting')
    expect(node).toEqual({ type: 'field', field: 'title', pattern: 'meeting' })
  })

  it('extractSearchText returns null (metadata-only)', () => {
    const node = TitleSyntaxHandler.tryParse('foo')!
    expect(TitleSyntaxHandler.extractSearchText(node)).toBeNull()
  })

  it('evaluate checks frontmatter.title (case-sensitive)', () => {
    const node = TitleSyntaxHandler.tryParse('Meeting')!
    const ctx = { frontmatter: { title: 'Team Meeting Notes' } } as any
    expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('evaluate checks headings metadata (case-sensitive)', () => {
    const node = TitleSyntaxHandler.tryParse('Meeting')!
    const ctx = {
      frontmatter: {},
      titles: [{ name: 'Meeting Agenda', lineText: '# Meeting Agenda', lineNumber: 5 }],
    } as any
    expect(TitleSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('collectFieldMatches from frontmatter and headings', () => {
    const node = TitleSyntaxHandler.tryParse('Meeting')!
    const ctx = {
      frontmatter: { title: 'Team Meeting' },
      titles: [{ name: 'Meeting Agenda', lineText: '# Meeting Agenda', lineNumber: 5 }],
    } as any

    const matches = TitleSyntaxHandler.collectFieldMatches(node, ctx)
    // Frontmatter title match + multiple heading matches
    expect(matches.length).toBeGreaterThanOrEqual(2)
    expect(matches.some(m => m.source === 'field:title')).toBe(true)
  })
})

// ── FilenameSyntaxHandler ──────────────────────────────────────────────

describe('FilenameSyntaxHandler', () => {

  it('tryParse produces FieldNode', () => {
    const node = FilenameSyntaxHandler.tryParse('doc')
    expect(node).toEqual({ type: 'field', field: 'filename', pattern: 'doc' })
  })

  it('extractSearchText returns null (metadata-only)', () => {
    const node = FilenameSyntaxHandler.tryParse('foo')!
    expect(FilenameSyntaxHandler.extractSearchText(node)).toBeNull()
  })

  it('evaluate checks file path basename', () => {
    const node = FilenameSyntaxHandler.tryParse('doc')!
    const ctx = { filePath: '/vault/mydocument.md' } as any
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })

  it('evaluate is case-insensitive', () => {
    const node = FilenameSyntaxHandler.tryParse('DOC')!
    const ctx = { filePath: '/vault/MyDocument.md' } as any
    expect(FilenameSyntaxHandler.evaluate(node, ctx)).toBe(true)
  })
})

// ── collectInlineTagPatterns ──────────────────────────────────────────

describe('collectInlineTagPatterns', () => {

  it('extracts #tag at line start', () => {
    const matches: SearchMatch[] = [
      { lineNumber: 1, lineText: '#foo is here', matchedText: '#foo' },
    ]
    const tags = collectInlineTagPatterns(matches)
    expect(tags.has('foo')).toBe(true)
  })

  it('extracts #tag after whitespace', () => {
    const matches: SearchMatch[] = [
      { lineNumber: 1, lineText: 'use #foo for tagging', matchedText: '#foo' },
    ]
    const tags = collectInlineTagPatterns(matches)
    expect(tags.has('foo')).toBe(true)
  })

  it('ignores url#anchor patterns', () => {
    const matches: SearchMatch[] = [
      { lineNumber: 1, lineText: 'check https://example.com#Anchor', matchedText: '#Anchor' },
    ]
    const tags = collectInlineTagPatterns(matches)
    expect(tags.has('anchor')).toBe(false)
    expect(tags.size).toBe(0)
  })

  it('ignores C# / F# language references', () => {
    const matches: SearchMatch[] = [
      { lineNumber: 1, lineText: 'use C# for .NET or F# for functional', matchedText: 'F#' },
    ]
    const tags = collectInlineTagPatterns(matches)
    expect(tags.size).toBe(0)
  })

  it('extracts multiple valid tags', () => {
    const matches: SearchMatch[] = [
      { lineNumber: 1, lineText: '#urgent #project meeting notes', matchedText: '#urgent' },
    ]
    const tags = collectInlineTagPatterns(matches)
    expect(tags.has('urgent')).toBe(true)
    expect(tags.has('project')).toBe(true)
  })
})
