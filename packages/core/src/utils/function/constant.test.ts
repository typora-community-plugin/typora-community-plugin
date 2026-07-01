import { constant } from "./constant"


describe('constant function', () => {

  it('should return a function that always returns the same value', () => {
    const fn = constant(42)

    expect(fn()).toBe(42)
    expect(fn()).toBe(42)
    expect(fn()).toBe(42)
  })

  it('should work with string values', () => {
    const fn = constant('hello')

    expect(fn()).toBe('hello')
    expect(fn()).toBe('hello')
  })

  it('should work with object values and return the same reference', () => {
    const obj = { a: 1, b: 2 }
    const fn = constant(obj)

    expect(fn()).toBe(obj)
    expect(fn()).toEqual({ a: 1, b: 2 })
  })

  it('should work with array values', () => {
    const arr = [1, 2, 3]
    const fn = constant(arr)

    expect(fn()).toBe(arr)
    expect(fn()).toEqual([1, 2, 3])
  })

  it('should work with boolean values', () => {
    const fnTrue = constant(true)
    const fnFalse = constant(false)

    expect(fnTrue()).toBe(true)
    expect(fnFalse()).toBe(false)
  })

  it('should work with null and undefined', () => {
    const fnNull = constant(null)
    const fnUndefined = constant(undefined)

    expect(fnNull()).toBeNull()
    expect(fnUndefined()).toBeUndefined()
  })

  it('should work with nested objects', () => {
    const nested = { a: { b: { c: 3 } } }
    const fn = constant(nested)

    expect(fn()).toBe(nested)
    expect(fn()).toEqual({ a: { b: { c: 3 } } })
  })
})
