import 'src/setup-test-env'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('src/ui/components/menu', () => ({
  InternalContextMenu: class {
    containerEl = document.createElement('ul')
    removeExtendedMenuItem = vi.fn()
  },
}))

vi.mock('src/ui/editor/codeblock', () => ({ Codeblock: class { } }))

vi.mock('src/ui/editor/link', () => ({
  MarkdownLinkWitoutExtension: class { },
  OpenLinkInCurrentWin: class { },
}))

vi.mock('src/ui/editor/postprocessor/postprocessor-manager', () => ({
  MarkdownPostProcessor: class {
    processAll = vi.fn()
    processAllCodeblock = vi.fn()
  },
  bindPostProcessorToEditor: vi.fn(),
}))

vi.mock('src/ui/editor/postprocessor/codeblock-postprocessor', () => ({
  blockMarkdownViewPreviewMode: vi.fn(),
}))

vi.mock('src/ui/editor/preprocessor/preprocessor', () => ({
  MarkdownPreProcessor: class {
    isEmpty = vi.fn(() => true)
  },
  bindPreProcessorToEditor: vi.fn(),
}))

vi.mock('src/ui/editor/suggestion/suggest-manager', () => ({
  EditorSuggestManager: class { },
}))

vi.mock('src/ui/editor/selection', () => ({
  EditorSelection: class {
    restoreForInsertion = vi.fn()
  },
}))

let observerCallback: ((records: any[]) => void) | undefined
vi.stubGlobal('MutationObserver', class {
  constructor(callback: (records: any[]) => void) {
    observerCallback = callback
  }
  observe = vi.fn()
  disconnect = vi.fn()
})

let writingArea: HTMLElement
let editor: any

;(globalThis as any).editor = {}
const { MarkdownEditor } = await import('src/ui/editor/markdown-editor')

function createEditorStub() {
  writingArea = document.createElement('div')
  writingArea.id = 'write'
  const wrapper = document.createElement('div')
  wrapper.append(writingArea)
  document.body.append(wrapper)

  editor = {
    writingArea,
    UserOp: { pasteHandler: vi.fn() },
    selection: { getRangy: vi.fn() },
    nodeMap: { allNodes: { _set: [] } },
    sourceView: { inSourceMode: false },
  }
  ;(globalThis as any).editor = editor
  ;(globalThis as any).File = { isNode: false }
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = ''
  observerCallback = undefined
  createEditorStub()
})

afterEach(() => {
  vi.useRealTimers()
})

async function createEditor() {
  const mdEditor = new MarkdownEditor()
  const loads: HTMLElement[] = []
  const edits: number[] = []
  const scrolls: number[] = []
  mdEditor.on('load', el => loads.push(el))
  mdEditor.on('edit', () => edits.push(1))
  mdEditor.on('scroll', () => scrolls.push(1))

  await vi.advanceTimersByTimeAsync(352)
  return { mdEditor, loads, edits, scrolls }
}


describe('MarkdownEditor constructor wiring', () => {

  test('emits load with the writing area and observes mutations', async () => {
    const { loads } = await createEditor()

    expect(loads).toEqual([writingArea])
    expect(observerCallback).toBeTypeOf('function')
  })

  test('re-emits scroll events from the writing area parent (debounced)', async () => {
    const { scrolls } = await createEditor()

    writingArea.parentElement!.dispatchEvent(new Event('scroll'))
    await vi.advanceTimersByTimeAsync(199)
    expect(scrolls).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(1)
    expect(scrolls).toHaveLength(1)
  })

  test('emits edit for text changes', async () => {
    const { edits } = await createEditor()

    observerCallback!([{ type: 'characterData', target: writingArea }])
    await vi.advanceTimersByTimeAsync(400)

    expect(edits).toHaveLength(1)
  })

  test('ignores mutations that do not change the document', async () => {
    const { edits } = await createEditor()
    editor.nodeMap.allNodes._set = []

    const record = () => ({
      type: 'childList',
      target: document.createElement('div'),
      addedNodes: [] as Node[],
      removedNodes: [] as Node[],
    })
    observerCallback!([record(), record()])
    await vi.advanceTimersByTimeAsync(400)

    expect(edits).toHaveLength(0)
  })

  test('treats adding and removing nodes as an edit', async () => {
    const { edits } = await createEditor()

    observerCallback!([{
      type: 'childList',
      target: document.createElement('div'),
      addedNodes: [document.createTextNode('a')],
      removedNodes: [document.createTextNode('b')],
    }])
    await vi.advanceTimersByTimeAsync(400)

    expect(edits).toHaveLength(1)
  })

  test('treats math insertion as an edit', async () => {
    const { edits } = await createEditor()
    const math = document.createElement('span')
    math.className = 'md-math-tex'

    observerCallback!([{
      type: 'childList',
      target: math,
      addedNodes: [],
      removedNodes: [],
    }])
    await vi.advanceTimersByTimeAsync(400)

    expect(edits).toHaveLength(1)
  })

  test('treats inline style changes as an edit', async () => {
    const { edits } = await createEditor()
    const span = document.createElement('span')
    const focus = document.createElement('span')
    focus.className = 'md-focus'

    observerCallback!([
      { type: 'childList', target: span, addedNodes: [], removedNodes: [] },
      { type: 'childList', target: focus, addedNodes: [], removedNodes: [] },
    ])
    await vi.advanceTimersByTimeAsync(400)

    expect(edits).toHaveLength(1)
  })

  test('detects paragraph count changes and remembers the new count', async () => {
    const { edits } = await createEditor()
    editor.nodeMap.allNodes._set = [{}, {}]

    const records = () => [
      {
        type: 'childList',
        target: document.createElement('div'),
        addedNodes: [] as Node[],
        removedNodes: [] as Node[],
      },
      {
        type: 'childList',
        target: document.createElement('div'),
        addedNodes: [] as Node[],
        removedNodes: [] as Node[],
      },
    ]
    observerCallback!(records())
    await vi.advanceTimersByTimeAsync(400)
    expect(edits).toHaveLength(1)

    observerCallback!(records())
    await vi.advanceTimersByTimeAsync(400)
    expect(edits).toHaveLength(1)
  })

  test('insertMarkdown delegates to the selection and paste handler', async () => {
    const { mdEditor } = await createEditor()

    mdEditor.insertMarkdown('text')

    expect(mdEditor.selection.restoreForInsertion).toHaveBeenCalledWith('selection')
    expect(editor.UserOp.pasteHandler).toHaveBeenCalledWith(editor, 'text', true)
  })

  test('insertMarkdown is a no-op without a writing area', async () => {
    const { mdEditor } = await createEditor()
    editor.writingArea = null

    mdEditor.insertMarkdown('text')

    expect(editor.UserOp.pasteHandler).not.toHaveBeenCalled()
  })
})
