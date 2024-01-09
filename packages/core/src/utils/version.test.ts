import { compare } from './versions'

describe('compare verion', () => {

  const v1 = '1.2.3-beta.4'
  const v2 = '1.2.3'
  const v3 = '1.2.4'
  const v4 = '1.3.0'
  const v5 = '2.0.0'

  test('x < y', () => {
    expect(compare(v1, v2)).toBe(-1)
    expect(compare(v2, v3)).toBe(-1)
    expect(compare(v3, v4)).toBe(-1)
    expect(compare(v4, v5)).toBe(-1)
  })

  test('x === y', () => {
    expect(compare(v1, v1)).toBe(0)
    expect(compare(v2, v2)).toBe(0)
  })

  test('x > y', () => {
    expect(compare(v2, v1)).toBe(1)
    expect(compare(v3, v2)).toBe(1)
    expect(compare(v4, v2)).toBe(1)
    expect(compare(v5, v2)).toBe(1)
  })
})
