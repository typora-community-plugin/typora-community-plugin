import { throttle } from "src/utils/schedule/throttle"
import { vi } from 'vitest'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should execute the function immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not execute during the throttle window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    throttled()
    throttled()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should execute again after the throttle window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled()
    vi.advanceTimersByTime(99)
    throttled()

    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    throttled()

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should call function with correct arguments', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('a', 'b', 'c')

    expect(fn).toHaveBeenCalledWith('a', 'b', 'c')

    vi.advanceTimersByTime(100)
    throttled('d', 'e', 'f')

    expect(fn).toHaveBeenCalledWith('d', 'e', 'f')
  })

  it('should call with correct `this` context', () => {
    const obj = {
      value: 42,
      fn: throttle(function (this: any) {
        this.value = 100
      }, 100),
    }

    ;(obj.fn as any).call(obj)

    expect(obj.value).toBe(100)
  })

  it('should always use the first call\'s arguments during the window', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled('first')
    throttled('second')
    throttled('third')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')

    vi.advanceTimersByTime(100)
    throttled('fourth')

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('fourth')
  })

  it('should handle rapid successive calls gracefully', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 50)

    throttled(1)
    for (let i = 2; i <= 10; i++) {
      throttled(i)
    }

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)

    vi.advanceTimersByTime(50)
    throttled(11)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(11)
  })

  it('should support multiple independent throttle instances', () => {
    const fn1 = vi.fn()
    const fn2 = vi.fn()

    const throttled1 = throttle(fn1, 100)
    const throttled2 = throttle(fn2, 100)

    throttled1()
    throttled2()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    throttled1()
    throttled2()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)

    throttled1()
    throttled2()

    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(2)
  })
})
