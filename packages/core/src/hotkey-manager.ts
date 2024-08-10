import { capitalize } from 'src/utils/string/capitalize'
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

  keybings: Record<string, EventListener[]> = {}

  editorKeybings: Record<string, EventListener[]> = {}

  constructor(
    markdownEditor = useEventBus('markdown-editor')
  ) {
    markdownEditor.on('load', (editorEl) => {
      // TODO move to MarkdownEditor

      document.body.addEventListener('keyup', this._onKeyup(this.keybings))

      editorEl.addEventListener('keyup', this._onKeyup(this.editorKeybings))
    })
  }

  private _onKeyup(keybings: Record<string, EventListener[]>) {
    return (event: KeyboardEvent) => {
      const hotkey = eventToHotkey(event)
      // TODO: try..catch with more msg
      keybings[hotkey]?.forEach(listener => listener(event))
    }
  }

  private _addHotkey(
    keybings: Record<string, EventListener[]>,
    hotkey: string,
    listener: EventListener
  ) {
    const normalHotkey = normalizeHotkey(hotkey)
    if (!keybings[normalHotkey]) {
      keybings[normalHotkey] = []
    }
    keybings[normalHotkey].push(listener)

    return () => this._removeHotkey(keybings, normalHotkey, listener, true)
  }

  private _removeHotkey(
    keybings: Record<string, EventListener[]>,
    hotkey: string,
    listener: EventListener,
    isNormal = false
  ) {
    const normalHotkey = isNormal
      ? hotkey
      : normalizeHotkey(hotkey)

    const hotkeyBings = keybings[normalHotkey]
    if (!hotkeyBings) return

    keybings[normalHotkey] = hotkeyBings.filter(fn => fn !== listener)
  }

  addHotkey(hotkey: string, listener: EventListener) {
    return this._addHotkey(this.keybings, hotkey, listener)
  }

  removeHotkey(hotkey: string, listener: EventListener) {
    this._removeHotkey(this.keybings, hotkey, listener)
  }

  addEditorHotkey(hotkey: string, listener: EventListener) {
    return this._addHotkey(this.editorKeybings, hotkey, listener)
  }

  removeEditorHotkey(hotkey: string, listener: EventListener) {
    this._removeHotkey(this.editorKeybings, hotkey, listener)
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
