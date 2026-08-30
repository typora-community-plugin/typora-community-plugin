import { jest } from '@jest/globals'
import { registerService } from "./common/service"
import { memorize } from "./utils/function/memorize"

// Minimal jQuery shim so `html`` and other DOM helpers work under jsdom.
;(globalThis as any).$ = ((selectorOrHtml: string | Element) => {
  const el = typeof selectorOrHtml === 'string'
    ? document.createRange().createContextualFragment(selectorOrHtml).firstElementChild!
    : selectorOrHtml

  return Object.assign(el, {
    get(i: number) { return i === 0 ? el : undefined },
    append(...children: Element[]) { for (const c of children) (el as HTMLElement).appendChild(c); return this },
    prepend(...children: Element[]) { for (const c of children) (el as HTMLElement).insertBefore(c, el.firstChild); return this },
    addClass(cls: string) { el.classList.add(cls); return this },
    removeClass(cls: string) { el.classList.remove(cls); return this },
    on(event: string, fn: EventListener) { el.addEventListener(event, fn); return this },
    appendTo(parent: Element) { parent.append(el); return this },
  })
})


registerService('logger', memorize(() =>
  new class { debug() { } info() { } warn() { } error() { } }
))

registerService('app', memorize(() => (
  {
    on: jest.fn(),
    emit: jest.fn(),
  } as any
)))

registerService('config-repository', memorize(() => {
  let configDir = '/default-config-dir'
  return {
    get configDir() { return configDir },
    setConfigDir(d: string) { configDir = d },
    readConfigJson: jest.fn()
      .mockImplementation((filename, defaultValue) => defaultValue),
    writeConfigJson: jest.fn(),
  } as any
}))

registerService('hotkey-manager', memorize(() => (
  {
    addHotkey: jest.fn().mockReturnValue(jest.fn()),
    addEditorHotkey: jest.fn().mockReturnValue(jest.fn()),
  } as any
)))
