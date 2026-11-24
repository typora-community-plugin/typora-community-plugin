import 'src/setup-test-env'
import { registerService } from 'src/common/service'
import { IndexSearchService } from 'src/ui/sidebar/search/services/index-search-service'
import type { ParsedAST } from 'src/ui/sidebar/search/services/query-parser'
import type { SearchMatch, SearchResult } from 'src/ui/sidebar/search/services/text-search-service'
import { beforeEach, describe, expect, test, vi } from 'vitest'


type Entry = {
  metadata?: {
    frontmatter?: Record<string, any>
    tags?: Array<{ lineNumber: number, lineText: string }>
    titles?: Array<{ lineNumber: number, lineText: string }>
  }
}

const VAULT = '/vault'

let cache: Record<string, Entry>
let metadata: { cache: Record<string, Entry>, get: any }
let service: IndexSearchService

function term(pattern: string): ParsedAST {
  return { type: 'term', pattern, isQuoted: false }
}

function field(name: string, pattern: string): ParsedAST {
  return { type: 'field', field: name, pattern }
}

function and(...children: ParsedAST[]): ParsedAST {
  return { type: 'and', children }
}

function or(...children: ParsedAST[]): ParsedAST {
  return { type: 'or', children }
}

function not(child: ParsedAST): ParsedAST {
  return { type: 'not', child }
}

function match(lineNumber: number, lineText: string, matchedText: string): SearchMatch {
  return { lineNumber, lineText, matchedText, source: 'body' }
}

function textResult(filePath: string, matches: SearchMatch[] = []): SearchResult {
  return { filePath, matches, totalMatches: matches.length }
}

beforeEach(() => {
  cache = {
    'notes/a.md': {
      metadata: {
        frontmatter: { tags: ['foo'] },
        tags: [{ lineNumber: 2, lineText: 'tags: [foo]' }],
        titles: [],
      },
    },
    'notes/b.md': {
      metadata: { frontmatter: { tags: ['bar'] } },
    },
    'image.png': {
      metadata: { frontmatter: {} },
    },
    '/vault/abs/c.md': {
      metadata: { frontmatter: { tags: ['foo'] } },
    },
  }
  metadata = {
    cache,
    get: vi.fn((relPath: string) => cache[relPath]),
  }

  registerService('metadata-manager', (() => metadata) as any)
  registerService('vault', (() => ({ path: VAULT })) as any)

  service = new IndexSearchService()
})


describe('IndexSearchService AST helpers', () => {

  test('getAST parses once and caches the result', () => {
    const first = service.getAST('tag:foo')
    const second = service.getAST('tag:foo')

    expect(first).toMatchObject({ type: 'field', field: 'tag', pattern: 'foo' })
    expect(second).toBe(first)
  })

  test('getAST returns null for an empty query', () => {
    expect(service.getAST('   ')).toBeNull()
  })

  test('extractTextTokenList collects text tokens and skips metadata-only fields', () => {
    const ast = and(
      term('hello'),
      field('tag', 'foo'),
      not(term('ignored')),
      field('unknown', 'x'),
    )

    expect(service.extractTextTokenList(ast)).toEqual(['hello', '#foo'])
  })

  test('extractTextTokens joins tokens with spaces', () => {
    const ast = or(term('alpha'), term('beta'))

    expect(service.extractTextTokens(ast)).toBe('alpha beta')
  })
})


describe('IndexSearchService.collectIndexOnlyResults()', () => {

  test('matches frontmatter tags and reports field matches', () => {
    const results = service.collectIndexOnlyResults(field('tag', 'foo'))

    const paths = results.map(r => r.filePath).sort()
    expect(paths).toEqual(['/vault/abs/c.md', '/vault/notes/a.md'])

    const a = results.find(r => r.filePath === '/vault/notes/a.md')!
    expect(a.totalMatches).toBe(1)
    expect(a.matches[0]).toMatchObject({
      lineNumber: 2,
      lineText: 'tags: [foo]',
      matchedText: 'foo',
      source: 'field:tag',
    })
  })

  test('returns nothing when the frontmatter does not match', () => {
    expect(service.collectIndexOnlyResults(field('tag', 'missing'))).toEqual([])
  })

  test('file scope skips body-less files and honours whole-file negation', () => {
    const filePatterns = new Map<string, Set<string>>([
      [`${VAULT}/notes/a.md`, new Set()],
      [`${VAULT}/notes/b.md`, new Set(['beta'])],
      [`${VAULT}/abs/c.md`, new Set(['beta'])],
    ])

    const results = service.collectIndexOnlyResults(not(term('beta')), filePatterns)

    expect(results.map(r => r.filePath)).toEqual([`${VAULT}/notes/a.md`])
  })

  test('file scope keeps non-markdown files when no whole-file negation is involved', () => {
    cache['image.png'] = { metadata: { frontmatter: { tags: ['foo'] } } }
    const filePatterns = new Map<string, Set<string>>()

    const results = service.collectIndexOnlyResults(field('tag', 'foo'), filePatterns)

    expect(results.some(r => r.filePath === `${VAULT}/image.png`)).toBe(true)
  })

  test('indexOnlySearch streams every collected result', () => {
    const onResult = vi.fn()

    service.indexOnlySearch(field('tag', 'foo'), onResult)

    expect(onResult).toHaveBeenCalledTimes(2)
  })
})


describe('IndexSearchService.buildResult()', () => {

  test('merges body matches with metadata field matches', () => {
    const result = service.buildResult(
      textResult(`${VAULT}/notes/a.md`, [match(5, 'hello foo', 'foo')]),
      field('tag', 'foo'),
    )!

    expect(result.filePath).toBe(`${VAULT}/notes/a.md`)
    expect(result.totalMatches).toBe(2)
    expect(result.matches.map(m => m.source)).toEqual(['body', 'field:tag'])
  })

  test('accepts already relative paths', () => {
    const result = service.buildResult(textResult('notes/a.md', []), field('tag', 'foo'))

    expect(result).not.toBeNull()
    expect(metadata.get).toHaveBeenCalledWith('notes/a.md')
  })

  test('returns null for files outside the metadata cache', () => {
    expect(service.buildResult(textResult(`${VAULT}/missing.md`, []), field('tag', 'foo')))
      .toBeNull()
  })

  test('returns null when the AST does not match the metadata', () => {
    expect(service.buildResult(textResult(`${VAULT}/notes/a.md`, []), field('tag', 'bar')))
      .toBeNull()
  })
})


describe('IndexSearchService.buildFinalResults()', () => {

  test('prepends index-only results when requested', () => {
    const results = service.buildFinalResults(
      field('tag', 'foo'),
      [textResult(`${VAULT}/notes/b.md`, [match(1, 'bar', 'bar')])],
      undefined,
      { includeIndexOnly: true },
    )

    expect(results.map(r => r.filePath).sort())
      .toEqual(['/vault/abs/c.md', '/vault/notes/a.md'])
  })

  test('only enriches text results when index-only results are off', () => {
    const results = service.buildFinalResults(
      field('tag', 'foo'),
      [
        textResult(`${VAULT}/notes/a.md`, [match(5, 'hello foo', 'foo')]),
        textResult(`${VAULT}/notes/b.md`, [match(1, 'bar', 'bar')]),
      ],
      undefined,
      { includeIndexOnly: false },
    )

    expect(results).toHaveLength(1)
    expect(results[0].filePath).toBe(`${VAULT}/notes/a.md`)
  })

  test('universe mode merges text hits into metadata universe results', () => {
    const results = service.buildFinalResults(
      field('tag', 'foo'),
      [
        textResult(`${VAULT}/notes/a.md`, [match(5, 'hello foo', 'foo')]),
        textResult(`${VAULT}/orphan.md`, [match(1, 'orphan', 'orphan')]),
      ],
      undefined,
      { includeIndexOnly: true, universe: true },
    )

    const a = results.find(r => r.filePath === `${VAULT}/notes/a.md`)!
    expect(a.totalMatches).toBe(2)
    // Files outside the metadata universe cannot be evaluated and are dropped.
    expect(results.some(r => r.filePath.endsWith('orphan.md'))).toBe(false)
  })
})
