import { RegexpBasedStringMask } from "./string-mask"


class TestStringMasker extends RegexpBasedStringMask {
  get cache() {
    return this._cache
  }
}

describe('mask single number', () => {
  const masker = new TestStringMasker(/\d/g, 'NUM')

  beforeEach(() => {
    masker.reset()
  })

  test('mask in begin', () => {
    const s = '0'
    expect(masker.mask(s)).toEqual('NUM')
    expect(masker.cache).toEqual(['0'])
  })

  test('mask single time', () => {
    const s = 'a=1'
    expect(masker.mask(s)).toEqual('a=NUM')
    expect(masker.cache).toEqual(['1'])
  })

  test('mask multi times', () => {
    const s = 'b=2 c=3'
    expect(masker.mask(s)).toEqual('b=NUM c=NUM')
    expect(masker.cache).toEqual(['2', '3'])
  })

  test('mask multi times in a row', () => {
    const s = 'd=45'
    expect(masker.mask(s)).toEqual('d=NUMNUM')
    expect(masker.cache).toEqual(['4', '5'])
  })

  describe('escape', () => {

    test('escape character in begin', () => {
      const s = '\\0'
      expect(masker.mask(s)).toEqual(s)
    })

    test('escape character', () => {
      const s = 'a=\\1'
      expect(masker.mask(s)).toEqual(s)
    })

    test('escape and not escape', () => {
      const s = 'a=\\1 b=2'
      expect(masker.mask(s)).toEqual('a=\\1 b=NUM')
    })
  })
})
