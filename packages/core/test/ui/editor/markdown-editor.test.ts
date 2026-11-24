import 'src/setup-test-env'
import { EditorSelection } from 'src/ui/editor/selection'

import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest'

// Some modules imported by `markdown-editor` read the Typora global at import
// time, so provide a minimal stub before loading it.
;(globalThis as any).editor = { tryOpenUrl_: undefined }
const { MarkdownEditor } = await import('src/ui/editor/markdown-editor')


function createRange(collapsed = false) {
  const range = {
    collapsed,
    collapse: vi.fn(() => { range.collapsed = true }),
    select: vi.fn(),
  }
  return range as any
}

function createEditor() {
  // Constructing `MarkdownEditor` would set up the whole Typora editor; only
  // the insertion logic is under test here.
  const mdEditor = Object.create(MarkdownEditor.prototype) as InstanceType<typeof MarkdownEditor>
  mdEditor.selection = new EditorSelection({ on: vi.fn() } as any)
  return mdEditor
}


describe('MarkdownEditor.insertMarkdown()', () => {
  let editor: any
  let mdEditor: InstanceType<typeof MarkdownEditor>
  let writingArea: HTMLElement
  let input: HTMLInputElement
  let codeEditor: HTMLTextAreaElement

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="write" contenteditable="true" tabindex="0"></div>
      <input id="other" />
      <div class="CodeMirror"><textarea></textarea></div>
    `
    writingArea = document.querySelector('#write')!
    input = document.querySelector('#other')!
    codeEditor = document.querySelector('textarea')!

    // `typora` imports are compiled to bare globals by esbuild-plugin-typora,
    // so the editor instance is provided through `globalThis` in tests.
    editor = {
      writingArea,
      selection: { getRangy: vi.fn() },
      UserOp: { pasteHandler: vi.fn() },
    }
    ;(globalThis as any).editor = editor
    mdEditor = createEditor()
  })


  test('replaces the live selection when the editor has focus', () => {
    writingArea.focus()
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)

    mdEditor.insertMarkdown('**bold**')

    expect(range.select).toHaveBeenCalled()
    expect(editor.UserOp.pasteHandler).toHaveBeenCalledWith(editor, '**bold**', true)
  })

  test('restores the last editor selection after focus moved to an input', () => {
    writingArea.focus()
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)

    document.dispatchEvent(new Event('selectionchange'))
    input.focus()
    editor.selection.getRangy.mockReturnValue(null)

    mdEditor.insertMarkdown('text')

    expect(range.select).toHaveBeenCalled()
    expect(document.activeElement).toBe(writingArea)
    expect(editor.UserOp.pasteHandler).toHaveBeenCalledWith(editor, 'text', true)
  })

  test('inserts at the cursor when `at` is "cursor"', () => {
    writingArea.focus()
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)

    mdEditor.insertMarkdown('text', 'cursor')

    expect(range.collapse).toHaveBeenCalledWith(false)
    expect(range.select).toHaveBeenCalled()
    expect(editor.UserOp.pasteHandler).toHaveBeenCalledWith(editor, 'text', true)
  })

  test('collapses a backward selection to the caret', () => {
    writingArea.focus()
    const range = createRange()
    range.isBackward = true
    editor.selection.getRangy.mockReturnValue(range)

    mdEditor.insertMarkdown('text', 'cursor')

    expect(range.collapse).toHaveBeenCalledWith(true)
    expect(range.select).toHaveBeenCalled()
  })

  test('keeps focus in a code fence and lets the native paste handler write there', () => {
    codeEditor.focus()
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)

    mdEditor.insertMarkdown('text')

    expect(document.activeElement).toBe(codeEditor)
    expect(range.select).not.toHaveBeenCalled()
    expect(editor.UserOp.pasteHandler).toHaveBeenCalledWith(editor, 'text', true)
  })
})


describe('MarkdownEditor file and cursor API', () => {
  let mdEditor: InstanceType<typeof MarkdownEditor>
  let editor: any

  beforeEach(() => {
    editor = {
      writingArea: document.createElement('div'),
      library: { openFile: vi.fn() },
      tryOpenUrl: vi.fn(),
      getMarkdown: vi.fn(() => '# current'),
      UserOp: { pasteHandler: vi.fn() },
      selection: { getRangy: vi.fn() },
    }
    ;(globalThis as any).editor = editor
    ;(globalThis as any).File = {
      isNode: false,
      reloadContent: vi.fn(),
    }

    mdEditor = Object.create(MarkdownEditor.prototype) as InstanceType<typeof MarkdownEditor>
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as any).File
  })

  test('openFile opens a plain path', () => {
    mdEditor.openFile('/notes/a.md')

    expect(editor.library.openFile).toHaveBeenCalledWith('/notes/a.md')
  })

  test('openFile opens a FileURL and follows its hash after a delay', () => {
    vi.useFakeTimers()

    mdEditor.openFile({ pathname: '/notes/a.md', hash: '#heading' } as any)

    expect(editor.library.openFile).toHaveBeenCalledWith('/notes/a.md')
    expect(editor.tryOpenUrl).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(editor.tryOpenUrl).toHaveBeenCalledWith('#heading')
  })

  test('getMarkdown reads from the Typora editor', () => {
    expect(mdEditor.getMarkdown()).toBe('# current')
  })

  test('setMarkdown reloads the file content', () => {
    mdEditor.setMarkdown('# next')

    expect((globalThis as any).File.reloadContent)
      .toHaveBeenCalledWith('# next', false, true, false, true)
  })
})

describe('MarkdownEditor._onContextMenu() non-right clicks', () => {
  test('ignores left clicks', () => {
    const writingArea = document.createElement('div')
    document.body.append(writingArea)
    ;(globalThis as any).editor = { writingArea }
    const mdEditor = Object.create(MarkdownEditor.prototype) as InstanceType<typeof MarkdownEditor>
    const menu = { containerEl: document.createElement('ul'), removeExtendedMenuItem: vi.fn() }
    ;(mdEditor as any)._contextmenu = menu
    const callback = vi.fn()

    mdEditor._onContextMenu(callback)
    writingArea.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))

    expect(callback).not.toHaveBeenCalled()
    expect(menu.removeExtendedMenuItem).not.toHaveBeenCalled()
  })
})

describe('MarkdownEditor._onContextMenu()', () => {
  let mdEditor: InstanceType<typeof MarkdownEditor>
  let menu: { containerEl: HTMLElement, removeExtendedMenuItem: Mock }
  let writingArea: HTMLElement
  let editor: any

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="write" contenteditable="true"></div>
      <ul id="context-menu"></ul>
    `
    writingArea = document.querySelector('#write')!
    editor = { writingArea, sourceView: { inSourceMode: false } }
    ;(globalThis as any).editor = editor

    mdEditor = Object.create(MarkdownEditor.prototype) as InstanceType<typeof MarkdownEditor>
    menu = {
      containerEl: document.querySelector('#context-menu')!,
      removeExtendedMenuItem: vi.fn(),
    }
    ;(mdEditor as any)._contextmenu = menu
    ;(mdEditor as any)._isContextMenuReady = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function rightClick() {
    writingArea.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
  }

  test('waits for the native menu to be shown on the first open', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    mdEditor._onContextMenu(callback)

    rightClick()
    expect(menu.removeExtendedMenuItem).toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()

    // Typora creates the native menu groups and shows the menu after mousedown.
    menu.containerEl.classList.add('show')
    await vi.advanceTimersByTimeAsync(352)

    expect(callback).toHaveBeenCalledWith({ menu })
    expect((mdEditor as any)._isContextMenuReady).toBe(true)
  })

  test('invokes plugins immediately once the native menu is ready', () => {
    ;(mdEditor as any)._isContextMenuReady = true
    const callback = vi.fn()
    mdEditor._onContextMenu(callback)

    rightClick()

    expect(callback).toHaveBeenCalledWith({ menu })
  })

  test('invokes plugins immediately in source mode', () => {
    editor.sourceView.inSourceMode = true
    const callback = vi.fn()
    mdEditor._onContextMenu(callback)

    rightClick()

    expect(callback).toHaveBeenCalledWith({ menu })
  })
})

