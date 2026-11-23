import { vi } from 'vitest'
import { debounce } from "../../../src/utils/schedule/debounce"

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should delay function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(99)

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should call function with correct arguments', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a', 'b', 'c')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('a', 'b', 'c')
  })

  it('should call with correct `this` context', () => {
    const obj = {
      value: 42,
      fn: debounce(function (this: any) {
        this.value = 100
      }, 100),
    }

    ;(obj.fn as any).call(obj)
    vi.advanceTimersByTime(100)

    expect(obj.value).toBe(100)
  })

  it('should call immediately when immediate is true', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, true)

    debounced()

    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should not call again during cooldown with immediate mode', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, true)

    debounced('first')
    vi.advanceTimersByTime(50)
    debounced('second')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')
  })

  it('should call again after cooldown with immediate mode', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100, true)

    debounced('first')
    vi.advanceTimersByTime(100)
    debounced('second')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('second')
  })

  it('should use last arguments in normal mode', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    vi.advanceTimersByTime(50)
    debounced('second')
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('second')
  })

  it('should be callable many times without extra executions', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    for (let i = 0; i < 100; i++) {
      debounced(i)
      vi.advanceTimersByTime(50)
    }

    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(99)
  })
})
