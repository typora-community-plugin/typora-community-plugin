import { jest } from '@jest/globals'
import path from './path'

describe('BrowserPath', () => {
  describe('sep', () => {
    test('should return one of the platform separators', () => {
      expect(['\\', '/']).toContain(path.sep)
    })
  })

  describe('isAbsolute()', () => {
    test('should return true for paths starting with /', () => {
      expect(path.isAbsolute('/foo')).toBe(true)
      expect(path.isAbsolute('/')).toBe(true)
      expect(path.isAbsolute('/foo/bar')).toBe(true)
    })

    test('should return false for relative paths', () => {
      expect(path.isAbsolute('foo')).toBe(false)
      expect(path.isAbsolute('./foo')).toBe(false)
      expect(path.isAbsolute('../foo')).toBe(false)
    })
  })

  describe('basename()', () => {
    test('should extract the file name from a path', () => {
      expect(path.basename('/foo/bar/baz.txt')).toBe('baz.txt')
      expect(path.basename('/foo/bar/baz')).toBe('baz')
      expect(path.basename('baz.txt')).toBe('baz.txt')
    })

    test('should handle both / and \\ separators', () => {
      expect(path.basename('foo\\bar\\baz.txt')).toBe('baz.txt')
      expect(path.basename('foo/bar\\baz.txt')).toBe('baz.txt')
    })

    test('should strip given suffix by length', () => {
      expect(path.basename('/foo/bar/baz.txt', '.txt')).toBe('baz')
      expect(path.basename('/foo/bar/baz.js', '.js')).toBe('baz')
    })

    test('should slice suffix.length chars even when suffix not matched', () => {
      expect(path.basename('/foo/bar/baz.txt', '.md')).toBe('baz.')
    })

    test('should handle trailing separator', () => {
      expect(path.basename('/foo/bar/')).toBe('bar')
      expect(path.basename('/foo/bar\\')).toBe('bar')
    })

    test('should return file name for root-level path', () => {
      expect(path.basename('/baz')).toBe('baz')
    })
  })

  describe('extname()', () => {
    test('should extract the file extension', () => {
      expect(path.extname('/foo/bar/baz.txt')).toBe('.txt')
      expect(path.extname('/foo/bar/baz.js')).toBe('.js')
      expect(path.extname('baz.json')).toBe('.json')
    })

    test('should return empty string for files without extension', () => {
      expect(path.extname('/foo/bar/baz')).toBe('')
      expect(path.extname('baz')).toBe('')
    })

    test('should treat leading dot as not an extension', () => {
      expect(path.extname('.gitignore')).toBe('')
      expect(path.extname('/foo/.gitignore')).toBe('')
    })

    test('should return last extension for files with multiple dots', () => {
      expect(path.extname('foo.bar.baz.txt')).toBe('.txt')
      expect(path.extname('.config.json')).toBe('.json')
    })
  })

  describe('dirname()', () => {
    test('should extract the directory from a path', () => {
      expect(path.dirname('/foo/bar/baz.txt')).toBe('/foo/bar')
      expect(path.dirname('/foo/bar/baz')).toBe('/foo/bar')
    })

    test('should handle both / and \\ separators', () => {
      expect(path.dirname('foo\\bar\\baz.txt')).toBe('foo' + path.sep + 'bar')
      expect(path.dirname('foo/bar\\baz.txt')).toBe('foo' + path.sep + 'bar')
    })

    test('should return / for root path', () => {
      expect(path.dirname('/')).toBe('/')
    })

    test('should return / for root-level file', () => {
      expect(path.dirname('/baz.txt')).toBe('/')
    })

    test('should handle trailing separator', () => {
      expect(path.dirname('/foo/bar/')).toBe('/foo')
    })

    test('should return / for single-segment relative path', () => {
      expect(path.dirname('baz.txt')).toBe(path.sep)
    })

    test('should handle relative paths', () => {
      expect(path.dirname('foo/bar.txt')).toBe('foo')
    })
  })

  describe('join()', () => {
    test('should join multiple path segments', () => {
      expect(path.join('foo', 'bar', 'baz.txt')).toBe('foo' + path.sep + 'bar' + path.sep + 'baz.txt')
    })

    test('should handle dot segments', () => {
      expect(path.join('foo', '.', 'bar')).toBe('foo' + path.sep + 'bar')
    })

    test('should handle dot-dot segments', () => {
      expect(path.join('foo', 'bar', '..', 'baz')).toBe('foo' + path.sep + 'baz')
    })

    test('should handle mixed separators', () => {
      const result = path.join('foo/bar', 'baz\\qux')
      expect(result).toBe('foo' + path.sep + 'bar' + path.sep + 'baz' + path.sep + 'qux')
    })

    test('should return . for empty input', () => {
      expect(path.join()).toBe('.')
    })

    test('should handle single segment', () => {
      expect(path.join('foo')).toBe('foo')
    })

    test('should handle consecutive dot-dot', () => {
      expect(path.join('foo', '..', '..')).toBe('')
    })

    test('should handle trailing separators', () => {
      const result = path.join('foo/', 'bar/')
      expect(result).toBe('foo' + path.sep + 'bar')
    })

    test('should treat leading / as empty segment, preserving it', () => {
      const result = path.join('/foo', 'bar')
      expect(result).toBe('/foo' + path.sep + 'bar')
    })

    test('should preserve leading // from joined segments', () => {
      const result = path.join('foo/', '/bar/')
      expect(result).toBe('foo//bar')
    })
  })

  describe('relative()', () => {
    test('should return empty string for identical paths', () => {
      expect(path.relative('foo/bar', 'foo/bar')).toBe('')
    })

    test('should compute relative path between sibling directories', () => {
      expect(path.relative('foo/a', 'foo/b')).toBe('..' + path.sep + 'b')
    })

    test('should return empty for ancestor-descendant paths', () => {
      expect(path.relative('foo', 'foo/bar/baz')).toBe('')
      expect(path.relative('foo/bar/baz', 'foo')).toBe('')
    })

    test('should handle mixed separators', () => {
      const result = path.relative('foo\\a', 'foo\\b')
      expect(result).toBe('..' + path.sep + 'b')
    })

    test('should produce .. segments for diverging paths', () => {
      expect(path.relative('a/b/c', 'a/b/x')).toBe('..' + path.sep + 'x')
    })

    test('should handle deeply nested diverging paths', () => {
      const result = path.relative('a/b/c', 'a/x/y')
      expect(result).toBe('..' + path.sep + 'x' + path.sep + '..' + path.sep + 'y')
    })

    test('should handle root-level differences', () => {
      expect(path.relative('a', 'b')).toBe('..' + path.sep + 'b')
    })

    test('should handle leading / stripped as empty segment', () => {
      expect(path.relative('/foo', '/baz')).toBe('..' + path.sep + 'baz')
    })
  })
})
