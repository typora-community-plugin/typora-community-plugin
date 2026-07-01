import 'src/setup-test-env'
import { uniqueId, _resetCounter } from './uniqueId'

describe('uniqueId', () => {
  beforeEach(() => {
    _resetCounter()
  })

  describe('with default prefix', () => {
    test('should return incrementing numeric string', () => {
      const id1 = uniqueId()
      const id2 = uniqueId()
      const id3 = uniqueId()

      expect(id1).toBe('1')
      expect(id2).toBe('2')
      expect(id3).toBe('3')
    })
  })

  describe('with custom prefix', () => {
    test('should prepend prefix to incrementing number', () => {
      const id1 = uniqueId('item-')
      const id2 = uniqueId('item-')

      expect(id1).toBe('item-1')
      expect(id2).toBe('item-2')
    })

    test('should maintain separate counters per prefix', () => {
      const a1 = uniqueId('a-')
      const b1 = uniqueId('b-')
      const a2 = uniqueId('a-')
      const b2 = uniqueId('b-')

      expect(a1).toBe('a-1')
      expect(b1).toBe('b-1')
      expect(a2).toBe('a-2')
      expect(b2).toBe('b-2')
    })
  })

  describe('edge cases', () => {
    test('should handle empty string prefix', () => {
      const id1 = uniqueId('')
      const id2 = uniqueId('')

      expect(id1).toBe('1')
      expect(id2).toBe('2')
    })

    test('should return string type', () => {
      const id = uniqueId('test-')

      expect(typeof id).toBe('string')
    })
  })
})
