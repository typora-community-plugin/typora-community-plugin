import 'src/setup-test-env'
import { eventToHotkey, HotkeyManager } from 'src/hotkey-manager'
import { vi } from 'vitest'


describe('HotkeyManager', () => {
  let manager: HotkeyManager
  let editorEl: HTMLDivElement

  beforeAll(() => {
    editorEl = document.createElement('div')
    document.body.append(editorEl)

    let onLoad: ((el: HTMLElement) => void) | undefined
    manager = new HotkeyManager({
      on: (_event: string, listener: (el: HTMLElement) => void) => {
        onLoad = listener
      },
    } as any)
    onLoad!(editorEl)
  })

  afterEach(() => {
    Object.keys(manager.keybindings).forEach(key => delete manager.keybindings[key])
    Object.keys(manager.editorKeybindings).forEach(key => delete manager.editorKeybindings[key])
  })

  test('matches hotkeys on keydown, including ⌘ combinations', () => {
    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches editor hotkeys on keydown', () => {
    const listener = vi.fn()
    manager.addEditorHotkey('Cmd+J', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches editor non-meta hotkeys on keyup', () => {
    const listener = vi.fn()
    manager.addEditorHotkey('Ctrl+.', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keyup', {
      key: '.',
      ctrlKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('prevents the default action when a hotkey matches', () => {
    const listener = vi.fn()
    manager.addEditorHotkey('Cmd+J', listener)
    const event = new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    editorEl.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  test('prevents the default action on keyup fallback', () => {
    const listener = vi.fn()
    manager.addHotkey('Ctrl+.', listener)
    const event = new KeyboardEvent('keyup', {
      key: '.',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })

    editorEl.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  test('does not prevent default when no hotkey matches', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })

    editorEl.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  test('matches editor hotkeys when a descendant stops propagation', () => {
    const child = document.createElement('div')
    editorEl.append(child)
    const stop = (event: Event) => event.stopPropagation()
    child.addEventListener('keydown', stop)

    const listener = vi.fn()
    manager.addEditorHotkey('Cmd+J', listener)

    child.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)

    child.removeEventListener('keydown', stop)
    child.remove()
  })

  test('matches editor hotkeys before the editor stops propagation', () => {
    const stop = (event: Event) => event.stopImmediatePropagation()
    editorEl.addEventListener('keydown', stop)

    const listener = vi.fn()
    manager.addEditorHotkey('Cmd+J', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)

    editorEl.removeEventListener('keydown', stop)
  })

  test('does not match editor hotkeys outside the editor', () => {
    const listener = vi.fn()
    manager.addEditorHotkey('Cmd+J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).not.toHaveBeenCalled()
  })

  test('matches global hotkeys inside the editor', () => {
    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches non-meta global hotkeys on keyup inside the editor', () => {
    const listener = vi.fn()
    manager.addHotkey('Ctrl+.', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keyup', {
      key: '.',
      ctrlKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches F1 on keyup', () => {
    const listener = vi.fn()
    manager.addHotkey('F1', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'F1',
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches non-meta global hotkeys on keydown inside the editor', () => {
    const listener = vi.fn()
    manager.addHotkey('Ctrl+.', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: '.',
      ctrlKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('does not fire twice when both keydown and keyup match', () => {
    const listener = vi.fn()
    manager.addHotkey('Ctrl+.', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: '.',
      ctrlKey: true,
      bubbles: true,
    }))
    editorEl.dispatchEvent(new KeyboardEvent('keyup', {
      key: '.',
      ctrlKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches global hotkeys dispatched on the document', () => {
    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches global hotkeys dispatched on the window', () => {
    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches global hotkeys when a descendant stops propagation', () => {
    const child = document.createElement('div')
    document.body.append(child)
    const stop = (event: Event) => event.stopPropagation()
    child.addEventListener('keydown', stop)

    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    child.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)

    child.removeEventListener('keydown', stop)
    child.remove()
  })

  test('does not fire twice when the key is released', () => {
    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))
    document.body.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('ignores auto-repeat keydown events', () => {
    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      repeat: true,
      bubbles: true,
    }))

    expect(listener).not.toHaveBeenCalled()
  })

  test('ignores plain keys typed during IME composition', () => {
    const listener = vi.fn()
    manager.addHotkey('J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'j',
      isComposing: true,
      bubbles: true,
    }))

    expect(listener).not.toHaveBeenCalled()
  })

  test('keeps modifier shortcuts working during IME composition', () => {
    const listener = vi.fn()
    manager.addHotkey('Cmd+J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      isComposing: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('eventToHotkey()', () => {
  test('converts a ⌘ keydown into a meta hotkey', () => {
    const event = new KeyboardEvent('keydown', { key: 'j', metaKey: true })
    expect(eventToHotkey(event)).toBe('meta+j')
  })

  test('converts a Ctrl keydown into a ctrl hotkey', () => {
    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    expect(eventToHotkey(event)).toBe('ctrl+s')
  })
})
