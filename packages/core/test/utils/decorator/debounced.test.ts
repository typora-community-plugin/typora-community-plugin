import { vi } from 'vitest'
import { debounced } from '../../../src/utils/decorator/debounced'


describe('debounced decorator', () => {

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  it('should debounce the method call', () => {
    class TestClass {
      public callCount = 0

      @debounced(100)
      public method() {
        this.callCount++
      }
    }

    const instance = new TestClass()

    instance.method()
    instance.method()
    instance.method()

    expect(instance.callCount).toBe(0)

    vi.advanceTimersByTime(100)

    expect(instance.callCount).toBe(1)
  })

  it('should use the last arguments after debounce', () => {
    class TestClass {
      public lastArg: string | null = null

      @debounced(100)
      public method(arg: string) {
        this.lastArg = arg
      }
    }

    const instance = new TestClass()

    instance.method('first')
    instance.method('second')
    instance.method('third')

    vi.advanceTimersByTime(100)

    expect(instance.lastArg).toBe('third')
  })

  it('should preserve this context', () => {
    class TestClass {
      public name = 'test'
      public result: string | null = null

      @debounced(50)
      public greet(greeting: string) {
        this.result = `${greeting}, ${this.name}`
      }
    }

    const instance = new TestClass()

    instance.greet('Hello')

    vi.advanceTimersByTime(50)

    expect(instance.result).toBe('Hello, test')
  })

  it('should reset debounce timer on successive calls', () => {
    class TestClass {
      public callCount = 0

      @debounced(100)
      public method() {
        this.callCount++
      }
    }

    const instance = new TestClass()

    instance.method()
    vi.advanceTimersByTime(50)
    instance.method()
    vi.advanceTimersByTime(50)
    instance.method()

    expect(instance.callCount).toBe(0)

    vi.advanceTimersByTime(100)

    expect(instance.callCount).toBe(1)
  })
})
