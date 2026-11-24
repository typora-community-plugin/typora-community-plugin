import { bindPreProcessorToEditor, MarkdownPreProcessor, RE_CODEBLOCK } from "src/ui/editor/preprocessor/preprocessor"
import { HtmlMask, RegexpBasedStringMask } from "src/ui/editor/preprocessor/string-mask"
import { editor } from "typora"
import { afterEach, vi } from "vitest"

const decorateMock = vi.hoisted(() => ({
  returnValue: vi.fn(),
  parameters: vi.fn(),
}))

vi.mock('@plylrnsdy/decorate.js', () => ({ default: decorateMock }))


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

    test('mask codeblock in quoteblock', () => {
      const s = '> ```\n> a\n> ```'
      expect(masker.mask(s)).toEqual('CB')
    })
  })
})

describe('mask html', () => {
  const masker = new HtmlMask('HTML')

  beforeEach(() => {
    masker.reset()
  })

  describe('self-closing tag', () => {

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
  })

  describe('tag with attribute', () => {

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

  describe('wrapped', () => {

    test('empty tag', () => {
      const s = '<i></i>'
      expect(masker.mask(s)).toEqual('HTML')
    })

    test('div { span }', () => {
      const s = '<div><span>text</span></div>'
      expect(masker.mask(s)).toEqual('HTML')
    })

    test('div { span, text }', () => {
      const s = '<div><span>text</span>text</div>'
      expect(masker.mask(s)).toEqual('HTML')
    })

    test('text, div { span }, text', () => {
      const s = 'text<div><span>text</span></div>text'
      expect(masker.mask(s)).toEqual('textHTMLtext')
    })

    test('text, div { span }, text, div { span }', () => {
      const s = 'text<div><span>text</span></div>text<div><span>text</span></div>'
      expect(masker.mask(s)).toEqual('textHTMLtextHTML')
    })
  })

  describe('not mask escaped tag', () => {

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

  describe('not mask arrow', () => {

    test('<-', () => {
      const s = '<-'
      expect(masker.mask(s)).toEqual(s)
    })

    test('<->', () => {
      const s = '<->'
      expect(masker.mask(s)).toEqual(s)
    })
  })

  describe('not mask non-tag', () => {

    test('<a', () => {
      const s = '<a\nhref>'
      expect(masker.mask(s)).toEqual(s)
    })
  })
})


describe('MarkdownPreProcessor', () => {
  const logger = { debug() { }, info() { }, warn() { }, error: vi.fn() }

  function createProcessor() {
    logger.error.mockClear()
    return new MarkdownPreProcessor(logger as any)
  }

  test('registers, reports and unregisters processors per (when, type)', () => {
    const p = createProcessor()
    const processor = { when: 'preload' as const, type: 'mdtext' as const, process: (s: string) => s }

    const unregister = p.register(processor)

    expect(p.isEmpty('preload')).toBe(false)
    expect(p.isEmpty('presave')).toBe(true)

    unregister()
    expect(p.isEmpty('preload')).toBe(true)
  })

  test('applies mdtext processors in registration order', () => {
    const p = createProcessor()
    p.register({ when: 'preload', type: 'mdtext', process: s => `${s}1` })
    p.register({ when: 'preload', type: 'mdtext', process: s => `${s}2` })

    expect(p.process('preload', 'a')).toBe('a12')
  })

  test('keeps processed processors scoped to their phase', () => {
    const p = createProcessor()
    p.register({ when: 'preload', type: 'mdtext', process: s => s.toUpperCase() })

    expect(p.process('preload', 'abc')).toBe('ABC')
    expect(p.process('presave', 'abc')).toBe('abc')
  })

  test('masks inline code and code blocks from mdtext processors', () => {
    const p = createProcessor()
    p.register({ when: 'preload', type: 'mdtext', process: s => s.replace(/a/g, 'A') })

    expect(p.process('preload', 'a `a`\n```\na\n```\na')).toBe('A `a`\n```\na\n```\nA')
  })

  test('masks html only during preload', () => {
    const p = createProcessor()
    p.register({ when: 'preload', type: 'mdtext', process: s => s.replace(/</g, '[') })
    p.register({ when: 'presave', type: 'mdtext', process: s => s.replace(/</g, '[') })

    expect(p.process('preload', '<br>')).toBe('<br>')
    expect(p.process('presave', '<br>')).toBe('[br>')
  })

  test('applies code processors to the masked code content only', () => {
    const p = createProcessor()
    p.register({ when: 'preload', type: 'code', process: s => s.toUpperCase() })

    expect(p.process('preload', 'x `code` y')).toBe('x `CODE` y')
  })

  test('resets masks between process() calls', () => {
    const p = createProcessor()

    expect(p.process('preload', '`a`')).toBe('`a`')
    expect(p.process('preload', '`b`')).toBe('`b`')
  })

  test('returns the original document and logs when a processor throws', () => {
    const p = createProcessor()
    p.register({
      when: 'preload',
      type: 'mdtext',
      process: () => { throw new Error('processor failed') },
    })

    expect(p.process('preload', 'original')).toBe('original')
    expect(logger.error).toHaveBeenCalledWith(expect.any(Error))
  })
})


describe('bindPreProcessorToEditor', () => {
  const logger = { debug() { }, info() { }, warn() { }, error: vi.fn() }

  afterEach(() => {
    decorateMock.returnValue.mockReset()
    decorateMock.parameters.mockReset()
    delete (globalThis as any).File
  })

  function setup(isNode: boolean) {
    ;(globalThis as any).File = { isNode }
    const preProcessor = new MarkdownPreProcessor(logger as any)
    bindPreProcessorToEditor({ preProcessor } as any)
    return preProcessor
  }

  test('decorates File.readContentFrom on Node.js', () => {
    setup(true)

    expect(decorateMock.returnValue).toHaveBeenCalledWith(
      expect.anything(),
      'readContentFrom',
      expect.any(Function),
    )
    expect(decorateMock.parameters).not.toHaveBeenCalled()

    const readContentFrom = decorateMock.returnValue.mock.calls[0][2]
    expect(readContentFrom([], ['file.md', 'text'])).toEqual(['file.md', 'text'])
  })

  test('processes the loaded content when preload processors exist', () => {
    const preProcessor = setup(true)
    preProcessor.register({ when: 'preload', type: 'mdtext', process: s => s.toUpperCase() })
    const readContentFrom = decorateMock.returnValue.mock.calls[0][2]

    const result = readContentFrom([], ['file.md', 'text'])

    expect(result[1]).toBe('TEXT')
  })

  test('decorates File.loadFile in the browser', () => {
    setup(false)

    expect(decorateMock.parameters).toHaveBeenCalledWith(
      expect.anything(),
      'loadFile',
      expect.any(Function),
    )
    expect(decorateMock.returnValue).toHaveBeenCalledTimes(1) // editor.getMarkdown
  })

  test('processes loadFile arguments when preload processors exist', () => {
    const preProcessor = setup(false)
    preProcessor.register({ when: 'preload', type: 'mdtext', process: s => s.toUpperCase() })
    const loadFile = decorateMock.parameters.mock.calls[0][2]

    const args = [null, null, ['text']]
    expect(loadFile(args)).toBe(args)
    expect(args[2][0]).toBe('TEXT')
  })

  test('leaves loadFile arguments untouched without preload processors', () => {
    setup(false)
    const loadFile = decorateMock.parameters.mock.calls[0][2]

    const args = [null, null, ['text']]
    expect(loadFile(args)).toBe(args)
    expect(args[2][0]).toBe('text')
  })

  test('decorates editor.getMarkdown for presave processors', () => {
    const preProcessor = setup(true)
    expect(decorateMock.returnValue).toHaveBeenLastCalledWith(
      editor,
      'getMarkdown',
      expect.any(Function),
    )

    const getMarkdown = decorateMock.returnValue.mock.calls[1][2]
    expect(getMarkdown([], 'text')).toBe('text')

    preProcessor.register({ when: 'presave', type: 'mdtext', process: s => `${s}!` })
    expect(getMarkdown([], 'text')).toBe('text!')
  })
})
