import 'src/setup-test-env'
import { vi } from 'vitest'
import { until } from '../../src/utils/until'

describe('until', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic resolution', () => {
    test('should resolve immediately when condition returns truthy', async () => {
      const spy = vi.fn(() => 'success')
      const promise = until(spy)

      vi.runAllTimers()

      await expect(promise).resolves.toBe('success')
      expect(spy).toHaveBeenCalledTimes(1)
    })

    test('should poll until condition returns truthy', async () => {
      let callCount = 0
      const spy = vi.fn(() => {
        callCount++
        return callCount >= 3 ? 'done' : false
      })
      const promise = until(spy)

      vi.runAllTimers()

      await expect(promise).resolves.toBe('done')
      expect(callCount).toBe(3)
    })

    test('should poll at ~352ms intervals', async () => {
      let callCount = 0
      const spy = vi.fn(() => {
        callCount++
        return callCount >= 2 ? true : false
      })
      const promise = until(spy)

      expect(callCount).toBe(0)

      vi.advanceTimersByTime(352)
      expect(callCount).toBe(1)

      vi.advanceTimersByTime(352)
      expect(callCount).toBe(2)

      await promise
    })
  })

  describe('falsy handling', () => {
    const falsyValues = [false, 0, '', null, undefined, NaN]

    test.each(falsyValues)('should treat %p as falsy and continue polling', async (value) => {
      let callCount = 0
      const spy = vi.fn(() => {
        callCount++
        return callCount >= 2 ? 'resolved' : value
      })
      const promise = until(spy)

      vi.runAllTimers()

      await expect(promise).resolves.toBe('resolved')
    })
  })

  describe('returned value', () => {
    test('should resolve with the truthy value', async () => {
      const result = { data: [1, 2, 3] }
      const spy = vi.fn(() => result)
      const promise = until(spy)

      vi.runAllTimers()

      await expect(promise).resolves.toBe(result)
    })

    test('should resolve with number values', async () => {
      const spy = vi.fn(() => 42)
      const promise = until(spy)

      vi.runAllTimers()

      await expect(promise).resolves.toBe(42)
    })

    test('should resolve with object value', async () => {
      const objResult = { key: 'value' }
      const promise = until(vi.fn(() => objResult))

      vi.runAllTimers()

      await expect(promise).resolves.toBe(objResult)
    })

    test('should resolve with array value', async () => {
      const arrResult = [1, 2, 3]
      const promise = until(vi.fn(() => arrResult))

      vi.runAllTimers()

      await expect(promise).resolves.toBe(arrResult)
    })
  })

  describe('side effects', () => {
    test('should stop polling after resolution', async () => {
      let callCount = 0
      const spy = vi.fn(() => {
        callCount++
        return true
      })
      const promise = until(spy)

      vi.runAllTimers()
      await promise

      const callsAfterResolve = callCount
      vi.advanceTimersByTime(352 * 10)

      expect(callCount).toBe(callsAfterResolve)
    })

    test('should call condition function synchronously on each poll', async () => {
      const order: number[] = []
      const spy = vi.fn(() => {
        order.push(1)
        return false
      })
      until(spy)

      vi.advanceTimersByTime(352)
      expect(order).toHaveLength(1)
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
