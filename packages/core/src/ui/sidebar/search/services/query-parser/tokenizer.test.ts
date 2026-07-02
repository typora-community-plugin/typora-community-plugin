import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { tokenize } from './tokenizer'
import type { RawToken } from './tokenizer'

describe('tokenize', () => {
  describe('basic whitespace handling', () => {
    test('should return empty array for empty string', () => {
      expect(tokenize('')).toEqual([])
    })

    test('should return empty array for whitespace-only string', () => {
      expect(tokenize('   ')).toEqual([])
    })

    test('should skip leading, trailing, and internal whitespace', () => {
      const result = tokenize('  hello  world  ')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ value: 'hello', isField: false, isQuoted: false, isNegated: false })
      expect(result[1]).toEqual({ value: 'world', isField: false, isQuoted: false, isNegated: false })
    })
  })

  describe('bare words', () => {
    test('should tokenize a single bare word', () => {
      const result = tokenize('hello')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ value: 'hello', isField: false, isQuoted: false, isNegated: false })
    })

    test('should tokenize multiple bare words separated by spaces', () => {
      const result = tokenize('foo bar baz')
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe('foo')
      expect(result[1].value).toBe('bar')
      expect(result[2].value).toBe('baz')
    })
  })

  describe('negation prefix', () => {
    test('should set isNegated for negated bare word', () => {
      const result = tokenize('-hello')
      expect(result).toHaveLength(1)
      expect(result[0].isNegated).toBe(true)
      expect(result[0].value).toBe('hello')
    })

    test('should lose negation when - is followed by whitespace (edge case)', () => {
      const result = tokenize('- hello')
      expect(result).toHaveLength(1)
      expect(result[0].isNegated).toBe(false)
      expect(result[0].value).toBe('hello')
    })
  })

  describe('quoted phrases', () => {
    test('should tokenize a double-quoted phrase', () => {
      const result = tokenize('"hello world"')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ value: 'hello world', isField: false, isQuoted: true, isNegated: false })
    })

    test('should trim whitespace inside quotes', () => {
      const result = tokenize('"  hello world  "')
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('hello world')
    })

    test('should set isNegated for negated quoted phrase', () => {
      const result = tokenize('-"hello world"')
      expect(result).toHaveLength(1)
      expect(result[0].isNegated).toBe(true)
      expect(result[0].isQuoted).toBe(true)
      expect(result[0].value).toBe('hello world')
    })

    test('should skip empty quoted strings', () => {
      const result = tokenize('""')
      expect(result).toHaveLength(0)
    })

    test('should handle unterminated quote as bare word', () => {
      const result = tokenize('hello"')
      const tokens = result.filter(t => t.value)
      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({ value: 'hello', isField: false, isQuoted: false, isNegated: false })
    })

    test('should handle unterminated quote with content as bare word', () => {
      const result = tokenize('"unterminated')
      expect(result).toHaveLength(1)
      expect(result[0].isQuoted).toBe(false)
      expect(result[0].value).toBe('unterminated')
    })

    test('should handle negated unterminated quote', () => {
      const result = tokenize('-"unterminated')
      expect(result).toHaveLength(1)
      expect(result[0].isNegated).toBe(true)
      expect(result[0].isQuoted).toBe(false)
      expect(result[0].value).toBe('unterminated')
    })

    test('should handle quoted phrase followed by bare word', () => {
      const result = tokenize('"hello" world')
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('hello')
      expect(result[0].isQuoted).toBe(true)
      expect(result[1].value).toBe('world')
      expect(result[1].isQuoted).toBe(false)
    })

    test('should handle bare word followed by quoted phrase', () => {
      const result = tokenize('foo "bar baz"')
      expect(result).toHaveLength(2)
      expect(result[0].value).toBe('foo')
      expect(result[0].isQuoted).toBe(false)
      expect(result[1].value).toBe('bar baz')
      expect(result[1].isQuoted).toBe(true)
    })
  })

  describe('parentheses', () => {
    test('should tokenize opening parenthesis', () => {
      const result = tokenize('(')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ value: '(', isField: false, isQuoted: false, isNegated: false })
    })

    test('should tokenize closing parenthesis', () => {
      const result = tokenize(')')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ value: ')', isField: false, isQuoted: false, isNegated: false })
    })

    test('should set isNegated for negated opening parenthesis', () => {
      const result = tokenize('-(')
      expect(result).toHaveLength(1)
      expect(result[0].value).toBe('(')
      expect(result[0].isNegated).toBe(true)
    })

    test('should tokenize parenthesized expression', () => {
      const result = tokenize('(foo bar)')
      expect(result).toHaveLength(4)
      expect(result[0].value).toBe('(')
      expect(result[1].value).toBe('foo')
      expect(result[2].value).toBe('bar')
      expect(result[3].value).toBe(')')
    })
  })

  describe('field prefixes', () => {
    test('should detect tag: prefix', () => {
      const result = tokenize('tag:hello')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        value: 'hello',
        field: 'tag',
        isField: true,
        isQuoted: false,
        isNegated: false,
      })
    })

    test('should detect title: prefix and stop at whitespace', () => {
      const result = tokenize('title:My Document')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        value: 'My',
        field: 'title',
        isField: true,
        isQuoted: false,
        isNegated: false,
      })
      expect(result[1]).toEqual({
        value: 'Document',
        isField: false,
        isQuoted: false,
        isNegated: false,
      })
    })

    test('should detect filename: prefix', () => {
      const result = tokenize('filename:readme.md')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        value: 'readme.md',
        field: 'filename',
        isField: true,
        isQuoted: false,
        isNegated: false,
      })
    })

    test('should handle negated field prefix', () => {
      const result = tokenize('-tag:secret')
      expect(result).toHaveLength(1)
      expect(result[0].isNegated).toBe(true)
      expect(result[0].field).toBe('tag')
      expect(result[0].value).toBe('secret')
    })

    test('should be case-insensitive for field prefix', () => {
      expect(tokenize('TAG:foo')[0].field).toBe('tag')
      expect(tokenize('Tag:foo')[0].field).toBe('tag')
      expect(tokenize('TITLE:foo')[0].field).toBe('title')
      expect(tokenize('FILENAME:foo')[0].field).toBe('filename')
    })

    test('should treat unknown prefix as bare word', () => {
      const result = tokenize('custom:value')
      expect(result).toHaveLength(1)
      expect(result[0].isField).toBe(false)
      expect(result[0].value).toBe('custom:value')
    })

    test('should stop at whitespace for field value', () => {
      const result = tokenize('tag:  hello  ')
      expect(result).toHaveLength(2)
      expect(result[0].field).toBe('tag')
      expect(result[0].value).toBe('')
      expect(result[1].value).toBe('hello')
    })

    test('should handle field prefix followed by bare word', () => {
      const result = tokenize('tag:foo bar')
      expect(result).toHaveLength(2)
      expect(result[0].field).toBe('tag')
      expect(result[0].value).toBe('foo')
      expect(result[1].value).toBe('bar')
    })
  })

  describe('complex queries', () => {
    test('should handle mixed bare words, quoted phrases, and fields', () => {
      const result = tokenize('hello "world" tag:foo')
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe('hello')
      expect(result[1].value).toBe('world')
      expect(result[1].isQuoted).toBe(true)
      expect(result[2].field).toBe('tag')
      expect(result[2].value).toBe('foo')
    })

    test('should handle parenthesized expression with field and negation', () => {
      const result = tokenize('(tag:foo -bar)')
      expect(result).toHaveLength(4)
      expect(result[0].value).toBe('(')
      expect(result[1].field).toBe('tag')
      expect(result[2].isNegated).toBe(true)
      expect(result[2].value).toBe('bar')
      expect(result[3].value).toBe(')')
    })

    test('should handle negated parenthesized group', () => {
      const result = tokenize('-(foo bar)')
      expect(result).toHaveLength(4)
      expect(result[0].value).toBe('(')
      expect(result[0].isNegated).toBe(true)
      expect(result[1].value).toBe('foo')
      expect(result[2].value).toBe('bar')
      expect(result[3].value).toBe(')')
    })

    test('should handle multiple negations', () => {
      const result = tokenize('-foo -"bar" -tag:baz')
      expect(result).toHaveLength(3)
      expect(result[0].isNegated).toBe(true)
      expect(result[0].value).toBe('foo')
      expect(result[1].isNegated).toBe(true)
      expect(result[1].isQuoted).toBe(true)
      expect(result[1].value).toBe('bar')
      expect(result[2].isNegated).toBe(true)
      expect(result[2].field).toBe('tag')
    })

    test('should handle query with special characters in bare words', () => {
      const result = tokenize('file.md #tag @mention')
      expect(result).toHaveLength(3)
      expect(result[0].value).toBe('file.md')
      expect(result[1].value).toBe('#tag')
      expect(result[2].value).toBe('@mention')
    })
  })
})
