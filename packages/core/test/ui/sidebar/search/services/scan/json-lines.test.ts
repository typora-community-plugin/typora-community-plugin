/**
 * JSON-lines stream parsing for ripgrep --json output.
 */


import {
  JsonLinesParser,
  matchPathOf,
  toSearchMatch,
} from 'src/ui/sidebar/search/services/scan/json-lines'
import { describe, expect, it, vi } from 'vitest'


function matchLine(path: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: "match",
    data: { path: { text: path }, ...extra },
  })
}

describe('JsonLinesParser', () => {

  it('returns the data of complete match records', () => {
    const parser = new JsonLinesParser()
    const events = parser.feed(`${matchLine('a.md')}\n${matchLine('b.md')}\n`)
    expect(events).toHaveLength(2)
    expect(events[0].path).toEqual({ text: 'a.md' })
  })

  it('buffers the partial trailing line until the next feed', () => {
    const parser = new JsonLinesParser()
    const full = matchLine('a.md')
    const head = full.slice(0, 20)
    const tail = full.slice(20)

    expect(parser.feed(head)).toEqual([])
    const events = parser.feed(`${tail}\n`)
    expect(events).toHaveLength(1)
    expect(events[0].path).toEqual({ text: 'a.md' })
  })

  it('completes a line whose CRLF is split across chunks', () => {
    const parser = new JsonLinesParser()
    parser.feed(`${matchLine('a.md')}\r`)
    const events = parser.feed(`\n${matchLine('b.md')}\r\n`)
    expect(events).toHaveLength(2)
    expect(events[0].path).toEqual({ text: 'a.md' })
    expect(events[1].path).toEqual({ text: 'b.md' })
  })

  it('skips empty and malformed lines', () => {
    const parser = new JsonLinesParser()
    const events = parser.feed(`\nnot json\n${matchLine('a.md')}\n`)
    expect(events).toHaveLength(1)
  })

  it('drops non-match records such as stats', () => {
    const parser = new JsonLinesParser()
    const events = parser.feed(`${JSON.stringify({ type: "stats", data: { matches: 1 } })}\n`)
    expect(events).toEqual([])
  })

  it('reset() discards the buffered partial line', () => {
    const parser = new JsonLinesParser()
    parser.feed('{"type":"match","data":{...broken\n')
    parser.reset()
    expect(parser.feed(`${matchLine('a.md')}\n`)).toHaveLength(1)
  })
})

describe('matchPathOf', () => {

  it('extracts the raw printed path', () => {
    expect(matchPathOf({ path: { text: 'sub/a.md' } })).toBe('sub/a.md')
  })

  it('returns null for records without a usable path', () => {
    expect(matchPathOf({})).toBeNull()
    expect(matchPathOf({ path: {} })).toBeNull()
    expect(matchPathOf({ path: { text: '' } })).toBeNull()
    expect(matchPathOf({ path: { text: 42 } })).toBeNull()
  })
})

describe('toSearchMatch', () => {

  it('reads line_number from the data top level, not span', () => {
    const match = toSearchMatch({
      line_number: 7,
      span: { line: 99, column_begin: 0 },
      lines: { text: 'hello world\n' },
      submatches: [{ match: { text: 'world' }, start: 6, end: 11 }],
    })
    expect(match).toEqual({
      lineNumber: 7,
      lineText: 'hello world',
      matchedText: 'world',
    })
  })

  it('falls back to span.line when line_number is absent', () => {
    const match = toSearchMatch({ span: { line: 3 }, lines: { text: 'x' } })
    expect(match.lineNumber).toBe(3)
  })

  it('defaults to zeros and empty strings for a bare record', () => {
    expect(toSearchMatch({})).toEqual({ lineNumber: 0, lineText: '', matchedText: '' })
  })

  it('strips line breaks from the line text', () => {
    const match = toSearchMatch({ lines: { text: 'a\r\nb\n' } })
    expect(match.lineText).toBe('ab')
  })

  it('takes the first submatch text', () => {
    const match = toSearchMatch({
      submatches: [
        { match: { text: 'first' } },
        { match: { text: 'second' } },
      ],
    })
    expect(match.matchedText).toBe('first')
  })
})
