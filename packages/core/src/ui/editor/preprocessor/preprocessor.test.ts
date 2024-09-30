import { RE_CODEBLOCK, RE_HTML } from "./preprocessor"
import { RegexpBasedStringMask } from "./string-mask"


describe('extract codeblock', () => {
  const masker = new RegexpBasedStringMask(RE_CODEBLOCK, 'CB')

  beforeEach(() => {
    masker.reset()
  })

  describe('mask inline code', () => {

    test('mask in begin', () => {
      const s = '`a`'
      expect(masker.mask(s)).toEqual('CB')
    })

    test('mask single time', () => {
      const s = 'text`a`'
      expect(masker.mask(s)).toEqual('textCB')
    })

    test('mask multi times', () => {
      const s = '1`a`2`b`'
      expect(masker.mask(s)).toEqual('1CB2CB')
    })

    test('mask multi times in a row', () => {
      const s = 'text`a``b`'
      expect(masker.mask(s)).toEqual('textCBCB')
    })

    describe('escape', () => {

      test('escape in begin', () => {
        const s = '\\`a`'
        expect(masker.mask(s)).toEqual(s)
      })

      test('escape in middle', () => {
        const s = 'text\\`a`'
        expect(masker.mask(s)).toEqual(s)
      })

      test('escape and not escape', () => {
        const s = '1\\`a`2`b`'
        expect(masker.mask(s)).toEqual('1\\`a`2CB')
      })
    })
  })

  describe('mask codeblock', () => {

    test('mask in begin', () => {
      const s = '```\na\n```'
      expect(masker.mask(s)).toEqual('CB')
    })

    test('mask single time', () => {
      const s = 'text\n```\na\n```'
      expect(masker.mask(s)).toEqual('textCB')
    })

    test('mask multi times', () => {
      const s = '1\n```\na\n```\n2\n```\nb\n```'
      expect(masker.mask(s)).toEqual('1CB\n2CB')
    })

    test('mask multi times in a row', () => {
      const s = 'text\n```\na\n```\n```\nb\n```'
      expect(masker.mask(s)).toEqual('textCBCB')
    })
  })
})

describe('mask html', () => {
  const masker = new RegexpBasedStringMask(RE_HTML, 'HTML')

  beforeEach(() => {
    masker.reset()
  })

  test('mask in begin', () => {
    const s = '<br>'
    expect(masker.mask(s)).toEqual('HTML')
  })

  test('mask single time', () => {
    const s = 'text<br>'
    expect(masker.mask(s)).toEqual('textHTML')
  })

  test('mask multi times', () => {
    const s = '1<br>2<br>'
    expect(masker.mask(s)).toEqual('1HTML2HTML')
  })

  test('mask multi times in a row', () => {
    const s = 'text<br><br>'
    expect(masker.mask(s)).toEqual('textHTMLHTML')
  })

  describe('mask tag with attribute', () => {
    test('tag with one attribute', () => {
      const s = '<img src>'
      expect(masker.mask(s)).toEqual('HTML')
    })

    test('tag with one attribute & value', () => {
      const s = '<img src="https://example.com/">'
      expect(masker.mask(s)).toEqual('HTML')
    })

    test('tag with 2 attributes', () => {
      const s = '<img src="https://example.com/" style="border: 1px solid black;">'
      expect(masker.mask(s)).toEqual('HTML')
    })
  })

  describe('escape', () => {

    test('escape in begin', () => {
      const s = '\\<br>'
      expect(masker.mask(s)).toEqual(s)
    })

    test('escape in middle', () => {
      const s = 'text\\<br>'
      expect(masker.mask(s)).toEqual(s)
    })

    test('escape and not escape', () => {
      const s = '1\\<br>2<br>'
      expect(masker.mask(s)).toEqual('1\\<br>2HTML')
    })
  })
})
