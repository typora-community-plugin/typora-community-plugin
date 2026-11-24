import 'src/setup-test-env'
import { registerService } from 'src/common/service'
import { Plugin } from 'src/plugin/plugin'
import { beforeEach, describe, expect, test, vi } from 'vitest'


class TestPlugin extends Plugin { }

const commands = { register: vi.fn(() => vi.fn()) }
const markdownEditor = {
  on: vi.fn(() => vi.fn()),
  preProcessor: { register: vi.fn(() => vi.fn()) },
  postProcessor: { register: vi.fn(() => vi.fn()) },
  suggestion: { register: vi.fn(() => vi.fn()) },
}

function createPlugin() {
  const app = {
    commands,
    workspace: {
      getViewByType: vi.fn(),
    },
  } as any

  const manifest = {
    id: 'test.plugin',
    name: 'Test Plugin',
    description: '',
    author: '',
    authorUrl: '',
    repo: '',
    version: '1.0.0',
    minAppVersion: '',
    minCoreVersion: '',
    platforms: [],
    dir: '/plugins/test',
  } as any

  return new TestPlugin(app, manifest)
}

beforeEach(() => {
  commands.register.mockClear().mockReturnValue(vi.fn())
  markdownEditor.on.mockClear()
  markdownEditor.preProcessor.register.mockClear()
  markdownEditor.postProcessor.register.mockClear()
  markdownEditor.suggestion.register.mockClear()
  document.head.innerHTML = ''

  registerService('config-repository', (() => ({
    dataDir: '/config/plugins',
  })) as any)
})


describe('Plugin', () => {

  test('dataPath points into the config directory', () => {
    const plugin = createPlugin()

    expect(plugin.dataPath).toBe('/config/plugins/test.plugin.json')
  })

  test('throws when settings are used before registration', () => {
    const plugin = createPlugin()

    expect(() => plugin.settings).toThrow('register `PluginSettings`')
  })

  test('registerSettings loads and exposes the settings', () => {
    const plugin = createPlugin()
    const settings = { load: vi.fn() } as any

    plugin.registerSettings(settings)

    expect(settings.load).toHaveBeenCalledTimes(1)
    expect(plugin.settings).toBe(settings)
  })

  test('registerCommand namespaces the id and title', () => {
    const plugin = createPlugin()
    const dispose = vi.fn()
    commands.register.mockReturnValueOnce(dispose)

    plugin.registerCommand({ id: 'hello', title: 'Hello', scope: 'global', callback: () => { } } as any)

    expect(commands.register).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test.plugin:hello',
      title: 'Test Plugin: Hello',
    }))

    // The returned disposer is invoked when the plugin unloads.
    plugin.load()
    plugin.unload()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  test('registerSettingTab adds the tab once the settings modal loads', () => {
    const plugin = createPlugin()
    const dispose = vi.fn()
    const tab = {} as any
    let onLoad: () => void = () => { }
    const modal = {
      once: vi.fn((_event: string, callback: () => void) => { onLoad = callback }),
      addGroupedTab: vi.fn(() => dispose),
    }
    ;(plugin as any).app.workspace.getViewByType.mockReturnValue(modal)

    plugin.registerSettingTab(tab)
    expect(modal.addGroupedTab).not.toHaveBeenCalled()

    onLoad()
    expect(modal.addGroupedTab).toHaveBeenCalledWith(2, tab)

    plugin.load()
    plugin.unload()
    expect(dispose).toHaveBeenCalled()
  })

  test('importScript injects a script tag and returns a disposer', () => {
    const plugin = createPlugin()

    const dispose = plugin.importScript('main.js')

    const script = document.head.querySelector('script')!
    expect(script.dataset.by).toBe('test.plugin')
    expect(script.src).toMatch(/\/plugins\/test\/main\.js$/)

    dispose()
    expect(document.head.querySelector('script')).toBeNull()
  })

  test('importCss injects a link tag and returns a disposer', () => {
    const plugin = createPlugin()

    const dispose = plugin.importCss('style.css')

    const link = document.head.querySelector('link')!
    expect(link.rel).toBe('stylesheet')
    expect(link.dataset.by).toBe('test.plugin')
    expect(link.href).toMatch(/\/plugins\/test\/style\.css$/)

    dispose()
    expect(document.head.querySelector('link')).toBeNull()
  })

  test('registerScript/registerCss clean up on unload', () => {
    const plugin = createPlugin()

    plugin.registerScript('main.js')
    plugin.registerCss('style.css')
    expect(document.head.querySelectorAll('script, link')).toHaveLength(2)

    plugin.load()
    plugin.unload()

    expect(document.head.querySelectorAll('script, link')).toHaveLength(0)
  })

  test('addStatusBarItem renders a footer item with position, hint and type', () => {
    stubFooterSelector()
    const plugin = createPlugin()

    const element = plugin.addStatusBarItem({ position: 'right', hint: 'tip', type: 'item' })

    expect(element.classList.contains('footer-item-right')).toBe(true)
    expect(element.classList.contains('footer-btn')).toBe(false)
    expect(element.getAttribute('ty-hint')).toBe('tip')
    expect(element.parentElement).not.toBeNull()

    plugin.load()
    plugin.unload()

    expect(element.parentElement).toBeNull()
  })

  test('addStatusBarItem defaults to a left button', () => {
    stubFooterSelector()
    const plugin = createPlugin()

    const element = plugin.addStatusBarItem()

    expect(element.classList.contains('footer-item-left')).toBe(true)
    expect(element.classList.contains('footer-btn')).toBe(true)
  })

  test('registerMarkdown* forwards to the markdown editor services', () => {
    registerMarkdownEditor()
    const plugin = createPlugin()
    const handler = vi.fn()

    plugin.registerMarkdownEvent('edit', handler)
    plugin.registerMarkdownPreProcessor({ id: 'pre', process: vi.fn() } as any)
    plugin.registerMarkdownPostProcessor({ id: 'post', process: vi.fn() } as any)
    plugin.registerMarkdownSuggest({ id: 'suggest' } as any)
    plugin.registerMarkdownSugguest({ id: 'old-suggest' } as any)

    expect(markdownEditor.on).toHaveBeenCalledWith('edit', handler)
    expect(markdownEditor.preProcessor.register).toHaveBeenCalledTimes(1)
    expect(markdownEditor.postProcessor.register).toHaveBeenCalledTimes(1)
    expect(markdownEditor.suggestion.register).toHaveBeenCalledTimes(2)
  })
})


function registerMarkdownEditor() {
  // Replace the minimal stub from setup-test-env with one that exposes the
  // editor extension points.
  registerService('markdown-editor', (() => markdownEditor) as any)
}

/**
 * The shared jQuery shim only understands HTML strings. `addStatusBarItem`
 * also uses a selector (`$('footer.ty-footer')`), so this test maps selectors
 * to a freshly built footer element.
 */
function stubFooterSelector() {
  const dollar = (globalThis as any).$
  ;(globalThis as any).$ = (arg: any) => {
    if (typeof arg === 'string' && !arg.trimStart().startsWith('<')) {
      return dollar('<footer class="ty-footer"></footer>')
    }
    return dollar(arg)
  }
}
