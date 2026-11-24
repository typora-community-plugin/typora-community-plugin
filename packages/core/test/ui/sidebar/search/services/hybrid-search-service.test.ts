import 'src/setup-test-env'
import { registerService } from 'src/common/service'
import { HybridSearchService } from 'src/ui/sidebar/search/services/hybrid-search-service'
import type { SearchOptions, SearchResult, WholeFileFacts } from 'src/ui/sidebar/search/services/text-search-service'
import { beforeEach, describe, expect, test, vi } from 'vitest'


const VAULT = '/vault'

type Entry = { metadata?: { frontmatter?: Record<string, any> } }

let cache: Record<string, Entry>
let textSearcher: {
  execute: ReturnType<typeof vi.fn>
  listFilesContaining: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
}
let hybrid: HybridSearchService

function textResult(filePath: string, lineText = 'alpha'): SearchResult {
  return {
    filePath,
    matches: [{ lineNumber: 1, lineText, matchedText: lineText, source: 'body' }],
    totalMatches: 1,
  }
}

function facts(files: Record<string, string[]>): WholeFileFacts {
  return {
    supported: true,
    ok: true,
    files: new Map(Object.entries(files).map(([path, patterns]) => [path, new Set(patterns)])),
  }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  cache = {
    'notes/a.md': { metadata: { frontmatter: { tags: ['foo'] } } },
    'notes/b.md': { metadata: { frontmatter: {} } },
    'notes/titled.md': { metadata: { frontmatter: { title: 'Hello World' } } },
    'image.png': { metadata: { frontmatter: {} } },
  }

  registerService('metadata-manager', (() => ({
    cache,
    get: (relPath: string) => cache[relPath],
  })) as any)
  registerService('vault', (() => ({ path: VAULT })) as any)

  textSearcher = {
    execute: vi.fn(),
    listFilesContaining: vi.fn(async () => facts({})),
    cancel: vi.fn(),
  }
  hybrid = new HybridSearchService(textSearcher as any)
})


describe('HybridSearchService.execute() without structured fields', () => {

  test('delegates empty queries to the text searcher', () => {
    const options = { onResult: vi.fn() }

    hybrid.execute('', options)

    expect(textSearcher.execute).toHaveBeenCalledWith('', options)
  })

  test('runs an index-only search when the AST has no text tokens', () => {
    const onResult = vi.fn()
    const onComplete = vi.fn()

    hybrid.execute('title:Hello', { onResult, onComplete })

    expect(textSearcher.execute).not.toHaveBeenCalled()
    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult.mock.calls[0][0].filePath).toBe(`${VAULT}/notes/titled.md`)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('scans metadata and enriches ripgrep hits', () => {
    textSearcher.execute.mockImplementation((_tokens: string[], options: SearchOptions) => {
      options.onResult?.(textResult(`${VAULT}/notes/a.md`))
      options.onResult?.(textResult(`${VAULT}/notes/b.md`, 'bar'))
      options.onComplete?.()
    })
    const onResult = vi.fn()
    const onComplete = vi.fn()

    hybrid.execute('tag:foo', { onResult, onComplete })

    expect(textSearcher.execute).toHaveBeenCalledWith(
      ['#foo'],
      expect.objectContaining({ onResult: expect.any(Function) }),
    )
    // index-only: a.md; body-enriched: a.md; b.md fails AST evaluation.
    expect(onResult.mock.calls.map(([result]) => result.filePath))
      .toEqual([`${VAULT}/notes/a.md`, `${VAULT}/notes/a.md`])
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})


describe('HybridSearchService.execute() with body negation', () => {

  test('emits files surviving whole-file negation without a positive search', async () => {
    textSearcher.listFilesContaining.mockResolvedValue(facts({
      [`${VAULT}/notes/a.md`]: [],
      [`${VAULT}/notes/b.md`]: ['beta'],
    }))
    const onResult = vi.fn()
    const onComplete = vi.fn()

    hybrid.execute('-beta', { onResult, onComplete })
    await flush()

    expect(textSearcher.execute).not.toHaveBeenCalled()
    expect(onResult.mock.calls.map(([result]) => result.filePath))
      .toEqual([`${VAULT}/notes/a.md`, `${VAULT}/notes/titled.md`])
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('combines positive text hits with negation facts', async () => {
    textSearcher.listFilesContaining.mockResolvedValue(facts({
      [`${VAULT}/notes/a.md`]: ['alpha'],
      [`${VAULT}/notes/b.md`]: ['alpha', 'beta'],
    }))
    textSearcher.execute.mockImplementation((_tokens: string[], options: SearchOptions) => {
      options.onResult?.(textResult(`${VAULT}/notes/a.md`))
      options.onResult?.(textResult(`${VAULT}/notes/b.md`))
      options.onComplete?.()
    })
    const onResult = vi.fn()
    const onComplete = vi.fn()

    hybrid.execute('alpha -beta', { onResult, onComplete })
    await flush()

    expect(textSearcher.listFilesContaining).toHaveBeenCalledWith(['beta'], expect.anything())
    expect(onResult.mock.calls.map(([result]) => result.filePath)).toEqual([`${VAULT}/notes/a.md`])
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('fails closed when the whole-file scan fails', async () => {
    textSearcher.listFilesContaining.mockResolvedValue({
      supported: true,
      ok: false,
      files: new Map(),
    })
    const onResult = vi.fn()
    const onComplete = vi.fn()

    hybrid.execute('-beta', { onResult, onComplete })
    await flush()

    expect(onResult).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('falls back to match-scoped evaluation when scans are unsupported', async () => {
    textSearcher.listFilesContaining.mockResolvedValue({
      supported: false,
      ok: false,
      files: new Map(),
    })
    const onResult = vi.fn()
    const onComplete = vi.fn()

    hybrid.execute('-beta', { onResult, onComplete })
    await flush()

    // Every metadata entry survives, including files without body text.
    expect(onResult.mock.calls.map(([result]) => result.filePath))
      .toContain(`${VAULT}/image.png`)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('enumerates the metadata universe for OR-with-negation queries', async () => {
    textSearcher.listFilesContaining.mockResolvedValue(facts({
      [`${VAULT}/notes/a.md`]: ['alpha'],
      [`${VAULT}/notes/b.md`]: ['beta'],
    }))
    textSearcher.execute.mockImplementation((_tokens: string[], options: SearchOptions) => {
      options.onResult?.(textResult(`${VAULT}/notes/a.md`))
      options.onComplete?.()
    })
    const onResult = vi.fn()

    hybrid.execute('alpha OR -beta', { onResult })
    await flush()

    expect(textSearcher.listFilesContaining).toHaveBeenCalledWith(['alpha', 'beta'], expect.anything())
    expect(onResult.mock.calls.map(([result]) => result.filePath))
      .toEqual([`${VAULT}/notes/a.md`, `${VAULT}/notes/titled.md`])
  })
})


describe('HybridSearchService.cancel()', () => {

  test('cancels the underlying text search', () => {
    hybrid.cancel()

    expect(textSearcher.cancel).toHaveBeenCalledTimes(1)
  })
})
