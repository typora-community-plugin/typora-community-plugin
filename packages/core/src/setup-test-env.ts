import { vi } from 'vitest'
import { registerService } from "./common/service"
import { memorize } from "./utils/function/memorize"

// jsdom lacks `innerText`; define it as an accessor on the prototype so any
// element can read/write it, backed by textContent.
Object.defineProperty(HTMLElement.prototype, 'innerText', {
  get(this: HTMLElement) { return this.textContent },
  set(value: string) { this.textContent = String(value) },
  configurable: true,
})

// jsdom lacks `PointerEvent` (like Safari < 13). Expose it so the pointer
// branch of `beginDrag` is exercised by default; the mouse fallback is
// tested explicitly by removing it.
;(globalThis as any).PointerEvent ??= MouseEvent

// jsdom's HTML parser drops table section elements outside a `<table>`, so
// wrap them before parsing (jQuery does the same internally).
function parseHtml(htmlStr: string): Element {
  const needsTableWrapper = /^\s*<(thead|tbody|tfoot|tr)\b/i.test(htmlStr)
  const fragment = document.createRange().createContextualFragment(
    needsTableWrapper ? `<table>${htmlStr}</table>` : htmlStr,
  )
  const first = fragment.firstElementChild!

  return needsTableWrapper
    ? (first.firstElementChild as Element)
    : first
}

// Minimal jQuery shim so `html`` and other DOM helpers work under jsdom.
;(globalThis as any).$ = ((selectorOrHtml: string | Element) => {
  const el = typeof selectorOrHtml === 'string'
    ? parseHtml(selectorOrHtml)
    : selectorOrHtml

  // jQuery-like chainable wrapper around a single element. `el` is the real DOM
  // node; extra methods are only for call sites that use them (e.g. `.on()`),
  // and never shadow native Element members such as `append`. The Proxy keeps
  // `el` itself as target so jsdom continues to treat it as a genuine node.
  const api = {
    get(i: number) { return i === 0 ? el : undefined },
    addClass(cls: string) { el.classList.add(cls); return this },
    removeClass(cls: string) { el.classList.remove(cls); return this },
    on(event: string, fn: EventListener) { el.addEventListener(event, fn); return this },
    appendTo(parent: Element) { parent.append(el); return this },
    append(...contents: Array<string | Node>) {
      for (const content of contents) {
        if (typeof content === 'string') {
          el.append(document.createRange().createContextualFragment(content))
        } else {
          el.append(content)
        }
      }
      return this
    },
  }

  const out = new Proxy(el, {
    get(target, prop) {
      if (prop in api) return (api as any)[prop]
      const v = (target as any)[prop]
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
  return out
})


registerService('logger', memorize(() =>
  new class { debug() { } info() { } warn() { } error() { } }
))

registerService('app', memorize(() => (
  {
    on: vi.fn(),
    emit: vi.fn(),
  } as any
)))

registerService('config-repository', memorize(() => {
  let configDir = '/default-config-dir'
  return {
    get configDir() { return configDir },
    setConfigDir(d: string) { configDir = d },
    readConfigJson: vi.fn()
      .mockImplementation((filename, defaultValue) => defaultValue),
    writeConfigJson: vi.fn(),
  } as any
}))

registerService('hotkey-manager', memorize(() => (
  {
    addHotkey: vi.fn().mockReturnValue(vi.fn()),
    addEditorHotkey: vi.fn().mockReturnValue(vi.fn()),
  } as any
)))

registerService('command-manager', memorize(() => ({
  register: vi.fn().mockReturnValue(vi.fn()),
} as any)))

registerService('i18n', memorize(() => ({
  locale: 'en',
  t: { notice: { clearAll: '' } },
} as any)))

registerService('vault', memorize(() => ({
  id: 'test-vault',
  path: '/vault',
  on: vi.fn(() => vi.fn()),
} as any)))

registerService('workspace', memorize(() => ({
  on: vi.fn(() => vi.fn()),
} as any)))

registerService('markdown-editor', memorize(() => ({
  getMarkdown: vi.fn(() => ''),
} as any)))
