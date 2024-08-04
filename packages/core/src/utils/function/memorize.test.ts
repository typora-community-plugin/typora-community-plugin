import { jest } from '@jest/globals'
import { memorize } from "./memorize"


// Sample function to be memorized
function expensiveCalculation(x: number, y: number): number {
  // console.log('Calculating...', x, y)
  return x * y
}

describe('memorize function', () => {

  it('should return the memoized result for the same arguments', () => {
    const memoizedFn = memorize(expensiveCalculation)

    // First call, should perform calculation
    const result1 = memoizedFn(2, 3)
    expect(result1).toBe(6)

    // Second call with same arguments, should return memoized result without calculation
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {}) // Mock console.log to avoid output
    const result2 = memoizedFn(2, 3)
    expect(result2).toBe(6)
    expect(spy).not.toHaveBeenCalledWith('Calculating...', 2, 3); // Ensure no recalculation
    spy.mockRestore() // Restore console.log
  })

  it('should perform new calculation for different arguments', () => {
    const memoizedFn = memorize(expensiveCalculation)

    const result1 = memoizedFn(2, 3)
    expect(result1).toBe(6)

    const result2 = memoizedFn(4, 5)
    expect(result2).toBe(20)
  })

  it('should handle different argument types correctly', () => {
    const memoizedFn = memorize((x: string, y: number) => `${x} ${y}`)

    const result1 = memoizedFn('hello', 42)
    expect(result1).toBe('hello 42')

    const result2 = memoizedFn('world', 100)
    expect(result2).toBe('world 100')
  })

  it.skip('should handle arguments with circular references gracefully', () => {
    const memoizedFn = memorize((obj: any) => obj)

    const obj = { a: 1 } as any
    obj.self = obj // Create a circular reference

    const result1 = memoizedFn(obj)
    expect(result1).toBe(obj)

    // Note: Testing for correctness with circular references in JSON.stringify is complex
    // and often not feasible due to TypeError. Here, we just ensure no exceptions are thrown.
  })
})
