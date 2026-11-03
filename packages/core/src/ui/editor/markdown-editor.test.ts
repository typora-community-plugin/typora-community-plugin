import 'src/setup-test-env'
import { jest, describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { EditorSelection } from './selection'

// Some modules imported by `markdown-editor` read the Typora global at import
// time, so provide a minimal stub before loading it.
;(globalThis as any).editor = { tryOpenUrl_: undefined }
const { MarkdownEditor } = await import('./markdown-editor')


function createRange(collapsed = false) {
  const range = {
    collapsed,
    collapse: jest.fn(() => { range.collapsed = true }),
    select: jest.fn(),
  }
  return range as any
}

function createEditor() {
  // Constructing `MarkdownEditor` would set up the whole Typora editor; only
  // the insertion logic is under test here.
  const mdEditor = Object.create(MarkdownEditor.prototype) as MarkdownEditor
  mdEditor.selection = new EditorSelection({ on: jest.fn() } as any)
  return mdEditor
}


describe('MarkdownEditor.insertMarkdown()', () => {
  let editor: any
  let mdEditor: MarkdownEditor
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
      selection: { getRangy: jest.fn() },
      UserOp: { pasteHandler: jest.fn() },
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


describe('MarkdownEditor._onContextMenu()', () => {
  let mdEditor: MarkdownEditor
  let menu: { containerEl: HTMLElement, removeExtendedMenuItem: jest.Mock }
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

    mdEditor = Object.create(MarkdownEditor.prototype) as MarkdownEditor
    menu = {
      containerEl: document.querySelector('#context-menu')!,
      removeExtendedMenuItem: jest.fn(),
    }
    ;(mdEditor as any)._contextmenu = menu
    ;(mdEditor as any)._isContextMenuReady = false
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  function rightClick() {
    writingArea.dispatchEvent(new MouseEvent('mousedown', { button: 2 }))
  }

  test('waits for the native menu to be shown on the first open', async () => {
    jest.useFakeTimers()
    const callback = jest.fn()
    mdEditor._onContextMenu(callback)

    rightClick()
    expect(menu.removeExtendedMenuItem).toHaveBeenCalled()
    jest.advanceTimersByTime(1000)
    expect(callback).not.toHaveBeenCalled()

    // Typora creates the native menu groups and shows the menu after mousedown.
    menu.containerEl.classList.add('show')
    await jest.advanceTimersByTimeAsync(352)

    expect(callback).toHaveBeenCalledWith({ menu })
    expect((mdEditor as any)._isContextMenuReady).toBe(true)
  })

  test('invokes plugins immediately once the native menu is ready', () => {
    ;(mdEditor as any)._isContextMenuReady = true
    const callback = jest.fn()
    mdEditor._onContextMenu(callback)

    rightClick()

    expect(callback).toHaveBeenCalledWith({ menu })
  })

  test('invokes plugins immediately in source mode', () => {
    editor.sourceView.inSourceMode = true
    const callback = jest.fn()
    mdEditor._onContextMenu(callback)

    rightClick()

    expect(callback).toHaveBeenCalledWith({ menu })
  })
})

