import 'src/setup-test-env'
import { EditorSelection } from 'src/ui/editor/selection'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'


function createRange(overrides: Record<string, any> = {}) {
  const range: any = {
    collapsed: false,
    isBackward: false,
    collapse: vi.fn(() => { range.collapsed = true }),
    select: vi.fn(),
    ...overrides,
  }
  return range
}

function createSelectionBus() {
  const handlers: Record<string, () => void> = {}
  return {
    bus: {
      on: vi.fn((event: string, handler: () => void) => {
        handlers[event] = handler
        return vi.fn()
      }),
    },
    emitEdit: () => handlers.edit?.(),
  }
}

let writingArea: HTMLElement
let codeEditor: HTMLTextAreaElement
let input: HTMLInputElement
let editor: any

beforeEach(() => {
  document.body.innerHTML = `
    <div id="write" contenteditable="true" tabindex="0">abc<span>def</span>ghi</div>
    <input id="other" />
    <div class="CodeMirror"><textarea></textarea></div>
  `
  writingArea = document.querySelector('#write')!
  codeEditor = document.querySelector('textarea')!
  input = document.querySelector('#other')!

  editor = {
    writingArea,
    selection: { getRangy: vi.fn() },
  }
  ;(globalThis as any).editor = editor
})

afterEach(() => {
  vi.restoreAllMocks()
})


describe('EditorSelection construction', () => {

  test('forgets the saved selection when the editor is edited', () => {
    const { bus, emitEdit } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange()

    selection.save()
    emitEdit()
    selection.restore()

    expect(range.select).not.toHaveBeenCalled()
  })

  test('captures selections made inside the editor on selectionchange', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)

    writingArea.focus()
    document.dispatchEvent(new Event('selectionchange'))
    selection.restore()

    expect(range.select).toHaveBeenCalledTimes(1)
  })

  test('ignores selectionchange when focus is outside the editor', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)

    input.focus()
    document.dispatchEvent(new Event('selectionchange'))
    selection.restore()

    expect(range.select).not.toHaveBeenCalled()
  })

  test('ignores selectionchange from CodeMirror', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)

    codeEditor.focus()
    document.dispatchEvent(new Event('selectionchange'))
    selection.restore()

    expect(range.select).not.toHaveBeenCalled()
  })

  test('ignores selectionchange when no range is available', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)

    editor.selection.getRangy.mockReturnValue(null)
    writingArea.focus()
    document.dispatchEvent(new Event('selectionchange'))

    expect(() => selection.restore()).not.toThrow()
  })
})


describe('EditorSelection.restoreForInsertion()', () => {

  test('does nothing without a writing area', () => {
    const { bus } = createSelectionBus()
    editor.writingArea = null
    const selection = new EditorSelection(bus as any)

    expect(() => selection.restoreForInsertion()).not.toThrow()
  })

  test('focuses the editor and restores the live range', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange()
    const focus = vi.spyOn(writingArea, 'focus')
    writingArea.focus()
    editor.selection.getRangy.mockReturnValue(range)

    selection.restoreForInsertion()

    expect(focus).toHaveBeenCalled()
    expect(range.select).toHaveBeenCalled()
  })

  test('collapses to the caret when insertion mode is "cursor"', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange({ isBackward: true })
    writingArea.focus()
    editor.selection.getRangy.mockReturnValue(range)

    selection.restoreForInsertion('cursor')

    expect(range.collapse).toHaveBeenCalledWith(true)
    expect(range.select).toHaveBeenCalled()
  })

  test('uses the saved range when focus moved elsewhere', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange()
    editor.selection.getRangy.mockReturnValue(range)
    selection.save()

    input.focus()
    editor.selection.getRangy.mockReturnValue(null)

    selection.restoreForInsertion()

    expect(range.select).toHaveBeenCalled()
  })

  test('falls back to a live range that is still inside the editor', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange({
      commonAncestorContainer: writingArea.querySelector('span')!.firstChild,
    })
    input.focus()
    editor.selection.getRangy.mockReturnValue(range)

    selection.restoreForInsertion()

    expect(range.select).toHaveBeenCalled()
  })

  test('ignores a live range outside the editor', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = createRange({ commonAncestorContainer: input })
    input.focus()
    editor.selection.getRangy.mockReturnValue(range)

    selection.restoreForInsertion()

    expect(range.select).not.toHaveBeenCalled()
  })

  test('collapses the window selection to the end in "cursor" mode', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const collapseToEnd = vi.fn()
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      collapseToEnd,
    } as any)
    input.focus()
    editor.selection.getRangy.mockReturnValue(null)

    selection.restoreForInsertion('cursor')

    expect(collapseToEnd).toHaveBeenCalled()
  })

  test('leaves an already collapsed selection alone', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const collapseToEnd = vi.fn()
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: true,
      collapseToEnd,
    } as any)
    input.focus()
    editor.selection.getRangy.mockReturnValue(null)

    selection.restoreForInsertion('cursor')

    expect(collapseToEnd).not.toHaveBeenCalled()
  })
})


describe('EditorSelection cursor offsets', () => {

  test('getCursor returns null without a selection', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)

    vi.spyOn(window, 'getSelection').mockReturnValue(null)

    expect(selection.getCursor()).toBeNull()
  })

  test('getCursor returns null without a writing area', () => {
    const { bus } = createSelectionBus()
    editor.writingArea = null
    const selection = new EditorSelection(bus as any)
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      focusNode: writingArea.firstChild,
      focusOffset: 0,
    } as any)

    expect(selection.getCursor()).toBeNull()
  })

  test('getCursor returns null when the focus node is outside the editor', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      focusNode: input,
      focusOffset: 0,
    } as any)

    expect(selection.getCursor()).toBeNull()
  })

  test('getCursor counts text before the focus node', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const spanText = writingArea.querySelector('span')!.firstChild!
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      focusNode: spanText,
      focusOffset: 1,
    } as any)

    // "abc" (3) + 1 inside "def"
    expect(selection.getCursor()).toBe(4)
  })

  test('getCursor returns the total length when the focus node is not a text node', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      focusNode: writingArea,
      focusOffset: 0,
    } as any)

    expect(selection.getCursor()).toBe('abcdefghi'.length)
  })

  test('setCursor places the caret inside the matching text node', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = { setStart: vi.fn(), collapse: vi.fn() }
    const windowSelection = { removeAllRanges: vi.fn(), addRange: vi.fn() }
    vi.spyOn(document, 'createRange').mockReturnValue(range as any)
    vi.spyOn(window, 'getSelection').mockReturnValue(windowSelection as any)

    selection.setCursor(4)

    const spanText = writingArea.querySelector('span')!.firstChild!
    expect(range.setStart).toHaveBeenCalledWith(spanText, 1)
    expect(range.collapse).toHaveBeenCalledWith(true)
    expect(windowSelection.addRange).toHaveBeenCalledWith(range)
  })

  test('setCursor collapses to the end when the offset is past all text', () => {
    const { bus } = createSelectionBus()
    const selection = new EditorSelection(bus as any)
    const range = { selectNodeContents: vi.fn(), collapse: vi.fn() }
    const windowSelection = { removeAllRanges: vi.fn(), addRange: vi.fn() }
    vi.spyOn(document, 'createRange').mockReturnValue(range as any)
    vi.spyOn(window, 'getSelection').mockReturnValue(windowSelection as any)

    selection.setCursor(999)

    expect(range.selectNodeContents).toHaveBeenCalledWith(writingArea)
    expect(range.collapse).toHaveBeenCalledWith(false)
    expect(windowSelection.addRange).toHaveBeenCalledWith(range)
  })
})
