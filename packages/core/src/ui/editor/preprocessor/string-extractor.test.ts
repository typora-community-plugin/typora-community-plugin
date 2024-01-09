import { StringExtractor } from "./string-extractor"


class TestStringExtractor extends StringExtractor {
  get cache() {
    return this._cache
  }
}

describe('extract single number', () => {
  const extractor = new TestStringExtractor(/\d/g, 'NUM')

  beforeEach(() => {
    extractor.reset()
  })

  test('extract in begin', () => {
    const s = '0'
    expect(extractor.extract(s)).toEqual('NUM')
    expect(extractor.cache).toEqual(['0'])
  })

  test('extract single time', () => {
    const s = 'a=1'
    expect(extractor.extract(s)).toEqual('a=NUM')
    expect(extractor.cache).toEqual(['1'])
  })

  test('extract multi times', () => {
    const s = 'b=2 c=3'
    expect(extractor.extract(s)).toEqual('b=NUM c=NUM')
    expect(extractor.cache).toEqual(['2', '3'])
  })

  test('extract multi times in a row', () => {
    const s = 'd=45'
    expect(extractor.extract(s)).toEqual('d=NUMNUM')
    expect(extractor.cache).toEqual(['4', '5'])
  })

  describe('escape', () => {

    test('escape character in begin', () => {
      const s = '\\0'
      expect(extractor.extract(s)).toEqual(s)
    })

    test('escape character', () => {
      const s = 'a=\\1'
      expect(extractor.extract(s)).toEqual(s)
    })

    test('escape and not escape', () => {
      const s = 'a=\\1 b=2'
      expect(extractor.extract(s)).toEqual('a=\\1 b=NUM')
    })
  })
})
