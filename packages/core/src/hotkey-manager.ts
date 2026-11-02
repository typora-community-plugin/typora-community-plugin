import { capitalize } from 'src/utils'
import { platform } from "src/common/constants"
import { useEventBus } from "./common/eventbus"


export type HotkeyScope = 'global' | 'editor'

const modifiers = ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as Array<keyof KeyboardEvent>

const modifiersWeights = modifiers.reduce(
  (o, n, i) => (o[shorterModifierName(n)] = i, o),
  {} as Record<string, number>
)
const maxModifiersWeights = modifiers.length

const arrowKeys: Record<string, string> = {
  'arrowup': '↑',
  'arrowdown': '↓',
  'arrowleft': '←',
  'arrowright': '→',
}


export class HotkeyManager {

  keybindings: Record<string, EventListener[]> = {}

  editorKeybindings: Record<string, EventListener[]> = {}

  constructor(
    markdownEditor = useEventBus('markdown-editor')
  ) {
    markdownEditor.on('load', (editorEl) => {
      // Match on both events and de-duplicate per physical key:
      // - `keydown` is required for meta (⌘/Win) combinations; macOS WebKit
      //   does not deliver `keyup` while ⌘ is held.
      // - `keyup` is the fallback for keys whose `keydown` an IME consumes
      //   (e.g. Ctrl+. for Chinese/English punctuation switching).
      const globalHandler = this._onKeyboardEvent(this.keybindings)
      const editorHandler = this._onKeyboardEvent(this.editorKeybindings)

      // Capture only `keydown`: Typora stops ⌘-shortcut keydowns from
      // bubbling, but leaves `keyup` alone. Keeping `keyup` on bubble also
      // preserves the old ordering relative to Typora's own keyup handler.
      window.addEventListener('keydown', globalHandler, true)
      window.addEventListener('keyup', globalHandler)

      editorEl.addEventListener('keydown', editorHandler, true)
      editorEl.addEventListener('keyup', editorHandler)
    })
  }

  private _onKeyboardEvent(keybindings: Record<string, EventListener[]>) {
    const handled = new Set<string>()

    // A lost keyup (e.g. ⌘ combinations on macOS) must not leave a key marked
    // as handled forever.
    window.addEventListener('blur', () => handled.clear())

    return (event: KeyboardEvent) => {
      if (event.type === 'keydown' && event.repeat) return

      if (event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey) return

      const code = event.code || event.key
      if (event.type === 'keyup') {
        if (handled.delete(code)) return
      }
      else if (event.type !== 'keydown') {
        return
      }

      const hotkey = eventToHotkey(event)
      const listeners = keybindings[hotkey]
      if (!listeners?.length) return

      if (event.type === 'keydown') {
        handled.add(code)
      }

      event.preventDefault()

      // TODO: try..catch with more msg
      listeners.forEach(listener => listener(event))
    }
  }

  private _addHotkey(
    keybindings: Record<string, EventListener[]>,
    hotkey: string,
    listener: EventListener
  ) {
    const normalHotkey = normalizeHotkey(hotkey)
    if (!keybindings[normalHotkey]) {
      keybindings[normalHotkey] = []
    }
    keybindings[normalHotkey].push(listener)

    return () => this._removeHotkey(keybindings, normalHotkey, listener, true)
  }

  private _removeHotkey(
    keybindings: Record<string, EventListener[]>,
    hotkey: string,
    listener: EventListener,
    isNormal = false
  ) {
    const normalHotkey = isNormal
      ? hotkey
      : normalizeHotkey(hotkey)

    const hotkeyBinds = keybindings[normalHotkey]
    if (!hotkeyBinds) return

    keybindings[normalHotkey] = hotkeyBinds.filter(fn => fn !== listener)
  }

  addHotkey(hotkey: string, listener: EventListener) {
    return this._addHotkey(this.keybindings, hotkey, listener)
  }

  removeHotkey(hotkey: string, listener: EventListener) {
    this._removeHotkey(this.keybindings, hotkey, listener)
  }

  addEditorHotkey(hotkey: string, listener: EventListener) {
    return this._addHotkey(this.editorKeybindings, hotkey, listener)
  }

  removeEditorHotkey(hotkey: string, listener: EventListener) {
    this._removeHotkey(this.editorKeybindings, hotkey, listener)
  }
}


export function eventToHotkey(event: KeyboardEvent) {
  return modifiers
    .filter(k => event[k])
    .map(shorterModifierName)
    .concat(shorterKeyName(event.key.toLowerCase()))
    .join('+')
}

function normalizeHotkey(hotkey: string) {
  return hotkey.toLowerCase()
    .replace(/cmd|command|win/, 'meta')
    .replace(/ctrl|control/, 'ctrl')
    .replace(/opt|option/, 'alt')
    .split('+')
    .map(shorterKeyName)
    .sort(keySorter)
    .join('+')
}

export function readableHotkey(hotkey: string) {
  return normalizeHotkey(hotkey)
    .replace(/meta/, platform() === 'darwin' ? 'cmd' : 'win' )
    .split('+')
    .map(capitalize)
    .join('+')
}

function shorterModifierName(key: string) {
  return key.slice(0, -3)
}

function shorterKeyName(key: string) {
  return arrowKeys[key] ?? key
}

function keySorter(a: string, b: string) {
  return (modifiersWeights[a] ?? maxModifiersWeights) - (modifiersWeights[b] ?? maxModifiersWeights)
}
