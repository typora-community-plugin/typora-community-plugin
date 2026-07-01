import { identity } from "./identity"


describe('identity function', () => {

  it('should return a number unchanged', () => {
    expect(identity(42)).toBe(42)
    expect(identity(-10)).toBe(-10)
    expect(identity(0)).toBe(0)
  })

  it('should return a string unchanged', () => {
    expect(identity('hello')).toBe('hello')
    expect(identity('')).toBe('')
  })

  it('should return a boolean unchanged', () => {
    expect(identity(true)).toBe(true)
    expect(identity(false)).toBe(false)
  })

  it('should return the same object reference', () => {
    const obj = { a: 1, b: 2 }
    expect(identity(obj)).toBe(obj)
  })

  it('should return the same array reference', () => {
    const arr = [1, 2, 3]
    expect(identity(arr)).toBe(arr)
  })

  it('should return null unchanged', () => {
    expect(identity(null)).toBeNull()
  })

  it('should return undefined unchanged', () => {
    expect(identity(undefined)).toBeUndefined()
  })

  it('should return a function unchanged', () => {
    const fn = () => 'hello'
    expect(identity(fn)).toBe(fn)
  })

  it('should work with typed inputs', () => {
    const num: number = identity(5) as number
    const str: string = identity('world') as string
    expect(num).toBe(5)
    expect(str).toBe('world')
  })

})
