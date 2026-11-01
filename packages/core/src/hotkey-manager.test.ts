import 'src/setup-test-env'
import { jest } from '@jest/globals'
import { HotkeyManager, eventToHotkey } from './hotkey-manager'


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
    const listener = jest.fn()
    manager.addHotkey('Cmd+J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('matches editor hotkeys on keydown', () => {
    const listener = jest.fn()
    manager.addEditorHotkey('Cmd+J', listener)

    editorEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      metaKey: true,
      bubbles: true,
    }))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('does not fire twice when the key is released', () => {
    const listener = jest.fn()
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
    const listener = jest.fn()
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
    const listener = jest.fn()
    manager.addHotkey('J', listener)

    document.body.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'j',
      isComposing: true,
      bubbles: true,
    }))

    expect(listener).not.toHaveBeenCalled()
  })

  test('keeps modifier shortcuts working during IME composition', () => {
    const listener = jest.fn()
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
