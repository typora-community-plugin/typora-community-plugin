import { jest } from '@jest/globals'
import { debounced } from './debounced'


describe('debounced decorator', () => {

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllTimers()
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

    jest.advanceTimersByTime(100)

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

    jest.advanceTimersByTime(100)

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

    jest.advanceTimersByTime(50)

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
    jest.advanceTimersByTime(50)
    instance.method()
    jest.advanceTimersByTime(50)
    instance.method()

    expect(instance.callCount).toBe(0)

    jest.advanceTimersByTime(100)

    expect(instance.callCount).toBe(1)
  })
})
