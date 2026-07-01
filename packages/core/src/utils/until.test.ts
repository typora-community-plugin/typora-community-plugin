import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { until } from './until'

describe('until', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('basic resolution', () => {
    test('should resolve immediately when condition returns truthy', async () => {
      const spy = jest.fn(() => 'success')
      const promise = until(spy)

      jest.runAllTimers()

      await expect(promise).resolves.toBe('success')
      expect(spy).toHaveBeenCalledTimes(1)
    })

    test('should poll until condition returns truthy', async () => {
      let callCount = 0
      const spy = jest.fn(() => {
        callCount++
        return callCount >= 3 ? 'done' : false
      })
      const promise = until(spy)

      jest.runAllTimers()

      await expect(promise).resolves.toBe('done')
      expect(callCount).toBe(3)
    })

    test('should poll at ~352ms intervals', async () => {
      let callCount = 0
      const spy = jest.fn(() => {
        callCount++
        return callCount >= 2 ? true : false
      })
      const promise = until(spy)

      expect(callCount).toBe(0)

      jest.advanceTimersByTime(352)
      expect(callCount).toBe(1)

      jest.advanceTimersByTime(352)
      expect(callCount).toBe(2)

      await promise
    })
  })

  describe('falsy handling', () => {
    const falsyValues = [false, 0, '', null, undefined, NaN]

    test.each(falsyValues)('should treat %p as falsy and continue polling', async (value) => {
      let callCount = 0
      const spy = jest.fn(() => {
        callCount++
        return callCount >= 2 ? 'resolved' : value
      })
      const promise = until(spy)

      jest.runAllTimers()

      await expect(promise).resolves.toBe('resolved')
    })
  })

  describe('returned value', () => {
    test('should resolve with the truthy value', async () => {
      const result = { data: [1, 2, 3] }
      const spy = jest.fn(() => result)
      const promise = until(spy)

      jest.runAllTimers()

      await expect(promise).resolves.toBe(result)
    })

    test('should resolve with number values', async () => {
      const spy = jest.fn(() => 42)
      const promise = until(spy)

      jest.runAllTimers()

      await expect(promise).resolves.toBe(42)
    })

    test('should resolve with object value', async () => {
      const objResult = { key: 'value' }
      const promise = until(jest.fn(() => objResult))

      jest.runAllTimers()

      await expect(promise).resolves.toBe(objResult)
    })

    test('should resolve with array value', async () => {
      const arrResult = [1, 2, 3]
      const promise = until(jest.fn(() => arrResult))

      jest.runAllTimers()

      await expect(promise).resolves.toBe(arrResult)
    })
  })

  describe('side effects', () => {
    test('should stop polling after resolution', async () => {
      let callCount = 0
      const spy = jest.fn(() => {
        callCount++
        return true
      })
      const promise = until(spy)

      jest.runAllTimers()
      await promise

      const callsAfterResolve = callCount
      jest.advanceTimersByTime(352 * 10)

      expect(callCount).toBe(callsAfterResolve)
    })

    test('should call condition function synchronously on each poll', async () => {
      const order: number[] = []
      const spy = jest.fn(() => {
        order.push(1)
        return false
      })
      until(spy)

      jest.advanceTimersByTime(352)
      expect(order).toHaveLength(1)
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })
})
