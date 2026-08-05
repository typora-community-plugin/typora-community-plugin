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
      // TODO move to MarkdownEditor

      document.body.addEventListener('keyup', this._onKeyup(this.keybindings))

      editorEl.addEventListener('keyup', this._onKeyup(this.editorKeybindings))
    })
  }

  private _onKeyup(keybindings: Record<string, EventListener[]>) {
    return (event: KeyboardEvent) => {
      const hotkey = eventToHotkey(event)
      // TODO: try..catch with more msg
      keybindings[hotkey]?.forEach(listener => listener(event))
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
