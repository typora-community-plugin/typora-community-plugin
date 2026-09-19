import 'src/setup-test-env'
import { jest, describe, expect, test } from '@jest/globals'
import { registerService } from 'src/common/service'
import { PluginManager } from './plugin-manager'

// `PluginManager` 构造时会用 setTimeout 懒加载一个真实的 `PluginMarketplace`，
// 这里注册它构造时需要的服务，避免定时器回调抛异常。
registerService('i18n', () => ({ locale: 'en', t: { notice: { clearAll: '' } } }) as any)
registerService('github', () => ({}) as any)
registerService('plugin-manager', () => ({ manifests: {} }) as any)

// Patch $ AFTER importing PluginManager so the Notice class (which uses $ internally
// via its constructor) gets our patched version when .then() callbacks execute.
const original$ = (globalThis as any).$
let capturedEl: HTMLElement | undefined

;(globalThis as any).$ = ((selectorOrHtml: string | Element) => {
  const el = typeof selectorOrHtml === 'string'
    ? document.createRange().createContextualFragment(selectorOrHtml).firstElementChild!
    : selectorOrHtml

  capturedEl = el as HTMLElement

  const api: Record<string, unknown> = {
    get(i: number) { return i === 0 ? el : undefined },
    addClass(cls: string) { (el as HTMLElement).classList.add(cls); return this },
    removeClass(cls: string) { (el as HTMLElement).classList.remove(cls); return this },
    on(event: string, fn: EventListener) { (el as HTMLElement).addEventListener(event, fn); return this },
    appendTo(parent: Element) { (parent as HTMLElement).append(el); return this },
  }

  // jQuery-like .append(htmlString | Node) — appends content then returns self.
  api.append = function (content: string | Node) {
    if (typeof content === 'string') {
      const frag = document.createRange().createContextualFragment(content)
      el.append(...Array.from(frag.childNodes))
    } else {
      el.append(content as Node)
    }
    return this
  }

  // jQuery-like .get(i) — access by index.
  api.get = function (i: number) { return i === 0 ? el : undefined }

  const out = new Proxy(el, {
    get(target, prop) {
      if (prop in api) return (api as any)[prop]
      const v = (target as any)[prop]
      return typeof v === 'function' ? v.bind(target) : v
    },
  })

  // Store capturedEl on the result for external access.
  ;(out as any).__rawElement__ = el

  return out
})

const ID = 'test.plugin'

function makeManager() {
  const logger = { debug() { }, info() { }, warn() { }, error() { } } as any
  const config = {
    configDir: '/config',
    readConfigJson: jest.fn(() => ({})),
    writeConfigJson: jest.fn(),
    on: jest.fn(),
  } as any
  const vault = { path: '/vault' } as any
  const i18n = { t: { pluginManager: { upToDate: '', updateSuccessful: '' } } } as any
  const env = { PLUGIN_GLOBAL_DIR: '' } as any

  const manager = new PluginManager(logger, config, vault, i18n, env)

  manager.manifests[ID] = { id: ID, name: 'Test', version: '1.0.0', position: 'global', dir: '/plugins/test' } as any
  manager.enabledPlugins[ID] = true
  manager.marketplace = {
    getPlugin: jest.fn(() => ({ id: ID, name: 'Test', repo: 'a/b', platforms: [] })),
    getPluginNewestVersion: jest.fn(async () => '2.0.0'),
    installPlugin: jest.fn(async () => { }),
  } as any

  return manager
}

describe('PluginManager.updatePlugin()', () => {
  test('should resolve only after the updated plugin is re-enabled', async () => {
    const manager = makeManager()

    jest.spyOn(manager, 'uninstallPlugin').mockResolvedValue(undefined as any)

    let resolveEnable!: () => void
    const enableGate = new Promise<void>((resolve) => { resolveEnable = resolve })
    let enableFinished = false
    jest.spyOn(manager, 'enablePlugin').mockImplementation(async () => {
      await enableGate
      enableFinished = true
      manager.enabledPlugins[ID] = true
    })

    let updateFinished = false
    const update = manager.updatePlugin(ID).then(() => { updateFinished = true })

    // 一个宏任务后：修复前 update 早已 resolve（updateFinished === true），
    // 修复后 update 仍阻塞在 enablePlugin 上（updateFinished === false）。
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(updateFinished).toBe(false)

    resolveEnable()
    await update

    expect(enableFinished).toBe(true)
    expect(manager.enabledPlugins[ID]).toBe(true)
  })
})
