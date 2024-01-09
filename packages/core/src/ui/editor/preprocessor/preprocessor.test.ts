import { RE_CODEBLOCK, RE_HTML } from "./preprocessor"
import { StringExtractor } from "./string-extractor"


describe('extract codeblock', () => {
  const extractor = new StringExtractor(RE_CODEBLOCK, 'CB')

  beforeEach(() => {
    extractor.reset()
  })

  describe('extract inline code', () => {

    test('extract in begin', () => {
      const s = '`a`'
      expect(extractor.extract(s)).toEqual('CB')
    })

    test('extract single time', () => {
      const s = 'text`a`'
      expect(extractor.extract(s)).toEqual('textCB')
    })

    test('extract multi times', () => {
      const s = '1`a`2`b`'
      expect(extractor.extract(s)).toEqual('1CB2CB')
    })

    test('extract multi times in a row', () => {
      const s = 'text`a``b`'
      expect(extractor.extract(s)).toEqual('textCBCB')
    })

    describe('escape', () => {

      test('escape in begin', () => {
        const s = '\\`a`'
        expect(extractor.extract(s)).toEqual(s)
      })

      test('escape in middle', () => {
        const s = 'text\\`a`'
        expect(extractor.extract(s)).toEqual(s)
      })

      test('escape and not escape', () => {
        const s = '1\\`a`2`b`'
        expect(extractor.extract(s)).toEqual('1\\`a`2CB')
      })
    })
  })

  describe('extract codeblock', () => {

    test('extract in begin', () => {
      const s = '```\na\n```'
      expect(extractor.extract(s)).toEqual('CB')
    })

    test('extract single time', () => {
      const s = 'text\n```\na\n```'
      expect(extractor.extract(s)).toEqual('textCB')
    })

    test('extract multi times', () => {
      const s = '1\n```\na\n```\n2\n```\nb\n```'
      expect(extractor.extract(s)).toEqual('1CB\n2CB')
    })

    test('extract multi times in a row', () => {
      const s = 'text\n```\na\n```\n```\nb\n```'
      expect(extractor.extract(s)).toEqual('textCBCB')
    })
  })
})

describe('extract html', () => {
  const extractor = new StringExtractor(RE_HTML, 'HTML')

  beforeEach(() => {
    extractor.reset()
  })

  test('extract in begin', () => {
    const s = '<br>'
    expect(extractor.extract(s)).toEqual('HTML')
  })

  test('extract single time', () => {
    const s = 'text<br>'
    expect(extractor.extract(s)).toEqual('textHTML')
  })

  test('extract multi times', () => {
    const s = '1<br>2<br>'
    expect(extractor.extract(s)).toEqual('1HTML2HTML')
  })

  test('extract multi times in a row', () => {
    const s = 'text<br><br>'
    expect(extractor.extract(s)).toEqual('textHTMLHTML')
  })

  describe('extract tag with attribute', () => {
    test('tag with one attribute', () => {
      const s = '<img src>'
      expect(extractor.extract(s)).toEqual('HTML')
    })

    test('tag with one attribute & value', () => {
      const s = '<img src="https://example.com/">'
      expect(extractor.extract(s)).toEqual('HTML')
    })

    test('tag with 2 attributes', () => {
      const s = '<img src="https://example.com/" style="border: 1px solid black;">'
      expect(extractor.extract(s)).toEqual('HTML')
    })
  })

  describe('escape', () => {

    test('escape in begin', () => {
      const s = '\\<br>'
      expect(extractor.extract(s)).toEqual(s)
    })

    test('escape in middle', () => {
      const s = 'text\\<br>'
      expect(extractor.extract(s)).toEqual(s)
    })

    test('escape and not escape', () => {
      const s = '1\\<br>2<br>'
      expect(extractor.extract(s)).toEqual('1\\<br>2HTML')
    })
  })
})
