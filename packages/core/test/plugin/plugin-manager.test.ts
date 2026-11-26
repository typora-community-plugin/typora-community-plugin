import 'src/setup-test-env'
import { registerService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { PluginManager } from 'src/plugin/plugin-manager'
import { Notice } from 'src/ui/components/notice'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('src/io/fs/filesystem', () => ({
  default: {
    isDirectory: vi.fn(),
    list: vi.fn(),
    listDirs: vi.fn(),
    readTextSync: vi.fn(),
    remove: vi.fn(),
  },
}))

// `PluginManager.marketplace` 会在首次访问时懒加载 `plugin-marketplace` 服务，
// 这里注册它可能间接依赖的服务，避免测试中抛异常。
const marketplaceStub = { marker: 'plugin-marketplace' } as any
registerService('i18n', () => ({ locale: 'en', t: { notice: { clearAll: '' } } }) as any)
registerService('github', () => ({}) as any)
registerService('plugin-manager', () => ({ manifests: {} }) as any)
registerService('plugin-marketplace', () => marketplaceStub)

// Patch $ AFTER importing PluginManager so the Notice class (which uses $ internally
// via its constructor) gets our patched version when .then() callbacks execute.
const _original$ = (globalThis as any).$
let _capturedEl: HTMLElement | undefined

;(globalThis as any).$ = ((selectorOrHtml: string | Element) => {
  const el = typeof selectorOrHtml === 'string'
    ? document.createRange().createContextualFragment(selectorOrHtml).firstElementChild!
    : selectorOrHtml

  _capturedEl = el as HTMLElement

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
  api.get = (i: number) => i === 0 ? el : undefined

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
    readConfigJson: vi.fn(() => ({})),
    writeConfigJson: vi.fn(),
    on: vi.fn(),
  } as any
  const vault = { path: '/vault' } as any
  const i18n = { t: { pluginManager: { upToDate: '', updateSuccessful: '' } } } as any
  const env = { PLUGIN_GLOBAL_DIR: '' } as any

  const manager = new PluginManager(logger, config, vault, i18n, env)

  manager.manifests[ID] = { id: ID, name: 'Test', version: '1.0.0', position: 'global', dir: '/plugins/test' } as any
  manager.enabledPlugins[ID] = true
  manager.marketplace = {
    getPlugin: vi.fn(() => ({ id: ID, name: 'Test', repo: 'a/b', platforms: [] })),
    getPluginNewestVersion: vi.fn(async () => '2.0.0'),
    installPlugin: vi.fn(async () => { }),
  } as any

  return manager
}

describe('PluginManager.updatePlugin()', () => {
  test('should resolve only after the updated plugin is re-enabled', async () => {
    const manager = makeManager()

    vi.spyOn(manager, 'uninstallPlugin').mockResolvedValue(undefined as any)

    let resolveEnable!: () => void
    const enableGate = new Promise<void>((resolve) => { resolveEnable = resolve })
    let enableFinished = false
    vi.spyOn(manager, 'enablePlugin').mockImplementation(async () => {
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

describe('PluginManager.marketplace', () => {
  test('should resolve synchronously from the plugin-marketplace service', () => {
    const logger = { debug() { }, info() { }, warn() { }, error() { } } as any
    const config = {
      configDir: '/config',
      readConfigJson: vi.fn(() => ({})),
      writeConfigJson: vi.fn(),
      on: vi.fn(),
    } as any
    const vault = { path: '/vault' } as any
    const i18n = { t: {} } as any
    const env = { PLUGIN_GLOBAL_DIR: '' } as any

    const manager = new PluginManager(logger, config, vault, i18n, env)

    // 修复前 `marketplace` 由构造函数里的 `setTimeout` 赋值，此处会是 `undefined`；
    // 修复后是同步解析的服务实例。
    expect(manager.marketplace).toBe(marketplaceStub)
    expect(manager.marketplace).toBe(marketplaceStub)
  })
})


describe('PluginManager manifests and lifecycle', () => {
  const ID = 'test.plugin'

  function createManager(options: {
    env?: any
    config?: any
    i18n?: any
  } = {}) {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
    const config = options.config ?? {
      configDir: '/config',
      readConfigJson: vi.fn(() => ({})),
      writeConfigJson: vi.fn(),
    }
    const vault = { path: '/vault' }
    const i18n = options.i18n ?? {
      t: {
        pluginManager: {
          needNewerCoreVersion: 'need newer core for {name}',
          upToDate: '{name} is up to date',
          updateSuccessful: '{name} updated',
        },
      },
    }
    const env = options.env ?? { PLUGIN_GLOBAL_DIR: '' }

    return new PluginManager(logger as any, config as any, vault as any, i18n as any, env as any)
  }

  function manifest(overrides: Record<string, any> = {}) {
    return {
      id: ID,
      name: 'Test Plugin',
      version: '1.0.0',
      minCoreVersion: '',
      position: 'global',
      dir: '/plugins/test',
      ...overrides,
    } as any
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(fs.isDirectory).mockReset().mockResolvedValue(true)
    vi.mocked(fs.list).mockReset().mockResolvedValue([])
    vi.mocked(fs.listDirs).mockReset().mockResolvedValue([])
    vi.mocked(fs.readTextSync).mockReset().mockReturnValue('{}')
    vi.mocked(fs.remove).mockReset().mockResolvedValue(undefined)
    vi.spyOn(Notice, 'info').mockImplementation(() => ({}) as any)
    vi.spyOn(Notice, 'success').mockImplementation(() => ({}) as any)
    vi.spyOn(Notice, 'error').mockImplementation(() => ({}) as any)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.head.querySelectorAll('[id^="typora-plugin:"]').forEach(el => el.remove())
  })

  test('pluginsDataDir lives under the config directory', () => {
    expect(createManager().pluginsDataDir).toBe('/config/data')
  })

  test('loadFromVault expands the plugin dir template and loads plugins', async () => {
    const manager = createManager({ env: { PLUGIN_GLOBAL_DIR: '/custom/{VAULT}/plugins' } })
    const config = (manager as any).config
    config.readConfigJson.mockReturnValue({ [ID]: true })
    vi.spyOn(manager, 'loadManifests').mockResolvedValue(undefined)
    vi.spyOn(manager, 'loadPlugins').mockResolvedValue([] as any)

    await manager.loadFromVault()

    expect(manager.globalPluginsDir).toBe('/custom//vault/plugins')
    expect(manager.vaultPluginsDir).toBe('/config/plugins')
    expect(manager.enabledPlugins).toEqual({ [ID]: true })
    expect(manager.loadManifests).toHaveBeenCalled()
    expect(manager.loadPlugins).toHaveBeenCalled()
  })

  test('loadFromVault falls back to the global plugins root', async () => {
    const manager = createManager()
    vi.spyOn(manager, 'loadManifests').mockResolvedValue(undefined)
    vi.spyOn(manager, 'loadPlugins').mockResolvedValue([] as any)

    await manager.loadFromVault()

    expect(manager.globalPluginsDir.endsWith('/plugins')).toBe(true)
  })

  test('loadManifests reads both plugin directories', async () => {
    const manager = createManager()
    manager.globalPluginsDir = '/global-plugins'
    manager.vaultPluginsDir = '/vault-plugins'
    vi.mocked(fs.listDirs).mockImplementation(async (dir: string) =>
      dir === '/global-plugins' ? ['a'] : [])
    vi.mocked(fs.readTextSync).mockReturnValue(JSON.stringify(manifest({ id: 'a' })))

    await manager.loadManifests()

    expect(manager.manifests.a).toMatchObject({
      id: 'a',
      position: 'global',
      dir: '/global-plugins/a',
    })
  })

  test('skips directories that do not exist', async () => {
    const manager = createManager()
    manager.globalPluginsDir = ''
    manager.vaultPluginsDir = '/missing'
    vi.mocked(fs.isDirectory).mockResolvedValue(false)

    await manager.loadManifests()

    expect(fs.listDirs).not.toHaveBeenCalled()
    expect(manager.manifests).toEqual({})
  })

  test('logs manifest parsing failures', async () => {
    const manager = createManager()
    vi.mocked(fs.readTextSync).mockReturnValue('{not json')

    await manager.loadManifest('global', '/plugins/broken')

    expect((manager as any).logger.error).toHaveBeenCalled()
    expect(manager.manifests).toEqual({})
  })

  test('loadPlugins only enables plugins marked as enabled', async () => {
    const manager = createManager()
    manager.manifests.a = manifest({ id: 'a' })
    manager.manifests.b = manifest({ id: 'b' })
    manager.enabledPlugins = { a: true }
    const enable = vi.spyOn(manager, 'enablePlugin').mockResolvedValue(undefined)

    await manager.loadPlugins()

    expect(enable).toHaveBeenCalledTimes(1)
    expect(enable).toHaveBeenCalledWith('a')
  })

  test('unloadPlugins unloads every enabled plugin without persisting disabled state', () => {
    const manager = createManager()
    const unloadA = vi.fn()
    const unloadB = vi.fn()
    manager.enabledPlugins = { a: true, b: true }
    manager.instances = { a: { unload: unloadA } as any, b: { unload: unloadB } as any }
    manager.styles = { a: 'a{}', b: 'b{}' }

    manager.unloadPlugins()

    expect(unloadA).toHaveBeenCalled()
    expect(unloadB).toHaveBeenCalled()
    expect(manager.enabledPlugins).toEqual({ a: true, b: true })
    expect(manager.instances).toEqual({})
    expect(manager.styles).toEqual({})

    vi.advanceTimersByTime(1_000)
    expect((manager as any).config.writeConfigJson).not.toHaveBeenCalled()
  })

  test('loadPlugin logs import failures', async () => {
    const manager = createManager()
    manager.manifests[ID] = manifest({ dir: '/definitely-not-existing' })

    await manager.loadPlugin(ID)

    expect((manager as any).logger.error).toHaveBeenCalledWith(`Plugin.load:${ID}`, expect.any(Error))
    expect(manager.instances[ID]).toBeUndefined()
  })

  test('unloadPlugin disables and forgets the instance and styles', () => {
    const manager = createManager()
    const unload = vi.fn()
    manager.instances[ID] = { unload } as any
    manager.styles[ID] = 'body{}'
    manager.enabledPlugins[ID] = true

    manager.unloadPlugin(ID)

    expect(unload).toHaveBeenCalled()
    expect(manager.instances[ID]).toBeUndefined()
    expect(manager.styles[ID]).toBeUndefined()
    expect(manager.enabledPlugins[ID]).toBeUndefined()
  })

  test('enablePlugin refuses plugins that need a newer core', async () => {
    const manager = createManager()
    manager.manifests[ID] = manifest({ minCoreVersion: '99.0.0' })
    const disable = vi.spyOn(manager, 'disablePlugin')

    await manager.enablePlugin(ID)

    expect(disable).toHaveBeenCalledWith(ID)
    expect(Notice.info).toHaveBeenCalledWith('need newer core for Test Plugin')
    expect(manager.enabledPlugins[ID]).toBeUndefined()
  })

  test('enablePlugin loads the instance, injects styles and persists state', async () => {
    const manager = createManager()
    manager.manifests[ID] = manifest()
    const load = vi.fn()
    manager.loadPlugin = vi.fn(async () => {
      manager.instances[ID] = { load } as any
    })
    manager.styles[ID] = 'body{color:red}'

    await manager.enablePlugin(ID)

    expect(load).toHaveBeenCalled()
    expect(manager.enabledPlugins[ID]).toBe(true)
    expect(document.getElementById(`typora-plugin:${ID}`)?.textContent).toBe('body{color:red}')

    vi.advanceTimersByTime(1_000)
    expect((manager as any).config.writeConfigJson)
      .toHaveBeenCalledWith('plugins', { [ID]: true })
  })

  test('enablePlugin logs errors thrown while loading the instance', async () => {
    const manager = createManager()
    manager.manifests[ID] = manifest()
    manager.instances[ID] = { load: () => { throw new Error('load failed') } } as any

    await manager.enablePlugin(ID)

    expect((manager as any).logger.error).toHaveBeenCalledWith(expect.any(Error))
    // The plugin is still marked as enabled.
    expect(manager.enabledPlugins[ID]).toBe(true)
  })

  test('disablePlugin logs unload failures but still cleans up', () => {
    const manager = createManager()
    manager.instances[ID] = { unload: () => { throw new Error('unload failed') } } as any
    manager.enabledPlugins[ID] = true
    document.head.insertAdjacentHTML('beforeend', `<style id="typora-plugin:${ID}"></style>`)

    manager.disablePlugin(ID)

    expect((manager as any).logger.error).toHaveBeenCalledWith(
      `Plugin.unload:${ID}`,
      expect.any(Error),
    )
    // The style cleanup shares the try block, so it is skipped on unload errors.
    expect(document.getElementById(`typora-plugin:${ID}`)).not.toBeNull()
    expect(manager.enabledPlugins[ID]).toBeUndefined()
  })

  test('disablePlugin removes the injected style', () => {
    const manager = createManager()
    manager.instances[ID] = { unload: vi.fn() } as any
    manager.enabledPlugins[ID] = true
    document.head.insertAdjacentHTML('beforeend', `<style id="typora-plugin:${ID}"></style>`)

    manager.disablePlugin(ID)

    expect(document.getElementById(`typora-plugin:${ID}`)).toBeNull()
  })

  test('updatePlugin ignores unknown plugins', async () => {
    const manager = createManager()
    manager.marketplace = { getPlugin: vi.fn(() => undefined) } as any

    await expect(manager.updatePlugin(ID)).resolves.toBeUndefined()
  })

  test('updatePlugin reports when the plugin is already up to date', async () => {
    const manager = createManager()
    manager.manifests[ID] = manifest({ version: '2.0.0' })
    manager.marketplace = {
      getPlugin: vi.fn(() => ({ id: ID, repo: 'a/b' })),
      getPluginNewestVersion: vi.fn(async () => '2.0.0'),
      installPlugin: vi.fn(),
    } as any
    const uninstall = vi.spyOn(manager, 'uninstallPlugin')

    await manager.updatePlugin(ID)

    expect(Notice.info).toHaveBeenCalledWith('Test Plugin is up to date')
    expect(uninstall).not.toHaveBeenCalled()
  })

  test('updatePlugin reinstalls and re-enables an enabled plugin', async () => {
    const manager = createManager()
    manager.manifests[ID] = manifest({ version: '1.0.0', position: 'vault' })
    manager.enabledPlugins[ID] = true
    const installPlugin = vi.fn(async () => { })
    manager.marketplace = {
      getPlugin: vi.fn(() => ({ id: ID, repo: 'a/b' })),
      getPluginNewestVersion: vi.fn(async () => '2.0.0'),
      installPlugin,
    } as any
    vi.spyOn(manager, 'uninstallPlugin').mockResolvedValue(undefined as any)
    const enable = vi.spyOn(manager, 'enablePlugin').mockResolvedValue(undefined)

    await manager.updatePlugin(ID)

    expect(installPlugin).toHaveBeenCalledWith(expect.objectContaining({ id: ID }), 'vault')
    expect(enable).toHaveBeenCalledWith(ID)
    expect(Notice.success).toHaveBeenCalledWith('Test Plugin updated')
  })

  test('uninstallPlugin removes files and forgets the plugin', async () => {
    const manager = createManager()
    manager.manifests[ID] = manifest({ dir: '/plugins/test' })
    manager.enabledPlugins[ID] = true

    await manager.uninstallPlugin(ID)

    expect(fs.remove).toHaveBeenCalledWith('/plugins/test')
    expect(manager.manifests[ID]).toBeUndefined()
    expect(manager.enabledPlugins[ID]).toBeUndefined()

    vi.advanceTimersByTime(1_000)
    expect((manager as any).config.writeConfigJson).toHaveBeenCalledWith('plugins', {})
  })

  test('the enabled config is saved with sorted keys', () => {
    const manager = createManager()
    manager.enabledPlugins = { b: true, a: false }

    ;(manager as any)._saveEnabledConfig()
    vi.advanceTimersByTime(1_000)

    expect((manager as any).config.writeConfigJson)
      .toHaveBeenCalledWith('plugins', { a: false, b: true })
  })

  test('does not persist enabled plugins that did not change', () => {
    const manager = createManager()
    manager.enabledPlugins = { a: true }
    ;(manager as any)._lastEnabledText = JSON.stringify({ a: true }, null, 2)

    ;(manager as any)._saveEnabledConfig()
    vi.advanceTimersByTime(1_000)

    expect((manager as any).config.writeConfigJson).not.toHaveBeenCalled()
  })
})
