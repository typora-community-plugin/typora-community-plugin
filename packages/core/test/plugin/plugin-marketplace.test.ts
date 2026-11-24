import 'src/setup-test-env'
import fs from 'src/io/fs/filesystem'
import type { PluginMarketInfo, PluginStat } from 'src/plugin/plugin-marketplace'
import { PluginMarketplace } from 'src/plugin/plugin-marketplace'
import { Notice } from 'src/ui/components/notice'
import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest'

vi.mock('src/io/fs/filesystem', () => ({
  default: {
    readTextSync: vi.fn(),
    remove: vi.fn(async () => { }),
    mkdir: vi.fn(async () => { }),
    trash: vi.fn(async () => { }),
    move: vi.fn(async () => { }),
  },
}))

const REPO = 'typora-community-plugin/typora-plugin-releases'
const BRANCH = 'main'

afterEach(() => {
  vi.restoreAllMocks()
})

function makePlugin(overrides: Partial<PluginMarketInfo> = {}): PluginMarketInfo {
  return {
    id: 'test.plugin',
    name: 'Test Plugin',
    description: 'A test plugin.',
    author: 'author',
    repo: REPO,
    platforms: ['win32'],
    ...overrides,
  }
}

function makeMarketplace(
  github: Mock | Record<string, any>,
  locale = 'zh-cn',
  manifests: Record<string, { version: string }> = {},
  plugins: Record<string, any> = {},
) {
  const logger = { debug() { }, info() { }, warn: vi.fn(), error: vi.fn() } as any
  const gh = typeof github === 'function' ? { getJSON: github } : github
  return new PluginMarketplace(
    logger,
    { locale, t: { pluginMarketplace: { idNotCorrect: 'id not correct' } } } as any,
    gh as any,
    { manifests, ...plugins } as any,
  )
}

describe('PluginMarketplace.loadCommunityPlugins()', () => {
  test('should use the locale-specific list file when available', async () => {
    const zhList = [makePlugin({ name: '测试插件' })]

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.zh-cn.json`) return zhList
      if (filepath === 'community-plugin-stats.json') return {}
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn')
    await marketplace.loadCommunityPlugins()

    expect(getJSON).toHaveBeenCalledWith(REPO, BRANCH, `community-plugins.zh-cn.json`)
    expect(marketplace.pluginList).toHaveLength(1)
    expect(marketplace.pluginList[0].name).toBe('测试插件')
  })

  test('should not request the localized file for English', async () => {
    const englishList = [makePlugin()]

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === 'community-plugins.json') return englishList
      if (filepath === 'community-plugin-stats.json') return {}
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'en')
    await marketplace.loadCommunityPlugins()

    expect(getJSON).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.stringMatching(/community-plugins\.[^/]+\.json$/))
    expect(marketplace.pluginList).toHaveLength(1)
    expect(marketplace.pluginList[0].name).toBe('Test Plugin')
  })

  test('should fall back to the English list when the localized file is missing', async () => {
    const englishList = [makePlugin()]

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.zh-cn.json`) throw new Error('404')
      if (filepath === 'community-plugins.json') return englishList
      if (filepath === 'community-plugin-stats.json') return {}
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn')
    await marketplace.loadCommunityPlugins()

    expect(getJSON).toHaveBeenCalledWith(REPO, BRANCH, `community-plugins.zh-cn.json`)
    expect(getJSON).toHaveBeenCalledWith(REPO, BRANCH, 'community-plugins.json')
    expect(marketplace.pluginList).toHaveLength(1)
    expect(marketplace.pluginList[0].name).toBe('Test Plugin')
  })

  test('should fall back to the English list when the localized file is empty', async () => {
    const englishList = [makePlugin()]

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.de.json`) return []
      if (filepath === 'community-plugins.json') return englishList
      if (filepath === 'community-plugin-stats.json') return {}
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'de')
    await marketplace.loadCommunityPlugins()

    expect(marketplace.pluginList).toHaveLength(1)
  })

  test('should keep an empty list and log errors when both files are missing', async () => {
    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === 'community-plugin-stats.json') return {}
      throw new Error('not found: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn') as any
    await marketplace.loadCommunityPlugins()

    expect(marketplace.pluginList).toHaveLength(0)
    expect(marketplace.logger.warn).toHaveBeenCalled()
    expect(marketplace.logger.error).toHaveBeenCalled()
  })

  test('should mark updates available from plugin stats', async () => {
    const zhList = [makePlugin()]
    const stats: Record<string, PluginStat> = {
      'test.plugin': { downloads: 1, updated: Date.now(), size: 1024, '1.2.3': 1 },
    }

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.zh-cn.json`) return zhList
      if (filepath === 'community-plugin-stats.json') return stats
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn')
    await marketplace.loadCommunityPlugins()

    expect(marketplace.pluginList[0].newestVersion).toBe('1.2.3')
  })

  test('should not mark updates when the installed plugin is already up to date', async () => {
    const zhList = [makePlugin()]
    const stats: Record<string, PluginStat> = {
      'test.plugin': { downloads: 1, updated: Date.now(), size: 1024, '1.2.3': 1 },
    }

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.zh-cn.json`) return zhList
      if (filepath === 'community-plugin-stats.json') return stats
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn', {
      'test.plugin': { version: '1.2.3' },
    })
    await marketplace.loadCommunityPlugins()

    expect(marketplace.pluginList[0].newestVersion).toBeUndefined()
  })

  test('should mark updates when the installed plugin is older', async () => {
    const zhList = [makePlugin()]
    const stats: Record<string, PluginStat> = {
      'test.plugin': { downloads: 1, updated: Date.now(), size: 1024, '1.2.3': 1 },
    }

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.zh-cn.json`) return zhList
      if (filepath === 'community-plugin-stats.json') return stats
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn', {
      'test.plugin': { version: '1.2.2' },
    })
    await marketplace.loadCommunityPlugins()

    expect(marketplace.pluginList[0].newestVersion).toBe('1.2.3')
  })

  test('should emit stats:loaded after update availability is marked', async () => {
    const zhList = [makePlugin()]
    const stats: Record<string, PluginStat> = {
      'test.plugin': { downloads: 1, updated: Date.now(), size: 1024, '1.2.3': 1 },
    }

    const getJSON = vi.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.zh-cn.json`) return zhList
      if (filepath === 'community-plugin-stats.json') return stats
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn', {
      'test.plugin': { version: '1.2.2' },
    })
    let newestVersionOnEvent: string | undefined
    marketplace.on('stats:loaded', () => {
      newestVersionOnEvent = marketplace.pluginList[0]?.newestVersion
    })

    await marketplace.loadCommunityPlugins()

    expect(newestVersionOnEvent).toBe('1.2.3')
  })
})


function makeGithub(overrides: Record<string, any> = {}) {  return {
    getJSON: vi.fn(async () => []),
    getReleaseInfo: vi.fn(async () => ({ tag_name: '9.9.9' })),
    getDefaultBranch: vi.fn(async () => 'main'),
    getFileText: vi.fn(async (_repo: string, _branch: string, _filepath: string) => undefined as string | undefined),
    downloadThenUnzipToTemp: vi.fn(async () => '/tmp/unzipped'),
    ...overrides,
  }
}

describe('PluginMarketplace lookup helpers', () => {

  test('isLoaded reflects whether a plugin list was loaded', () => {
    const marketplace = makeMarketplace(makeGithub())

    expect(marketplace.isLoaded).toBe(false)

    marketplace.pluginList.push(makePlugin())

    expect(marketplace.isLoaded).toBe(true)
  })

  test('getPlugin finds a plugin by id', () => {
    const marketplace = makeMarketplace(makeGithub())
    marketplace.pluginList = [makePlugin({ id: 'a' }), makePlugin({ id: 'b' })]

    expect(marketplace.getPlugin('b')?.id).toBe('b')
    expect(marketplace.getPlugin('missing')).toBeUndefined()
  })

  test('getPluginNewestVersion prefers the cached market value', async () => {
    const github = makeGithub()
    const marketplace = makeMarketplace(github)
    const info = makePlugin({ newestVersion: '2.0.0' })

    await expect(marketplace.getPluginNewestVersion(info)).resolves.toBe('2.0.0')
    expect(github.getReleaseInfo).not.toHaveBeenCalled()
  })

  test('getPluginNewestVersion prefers the newest release in stats', async () => {
    const github = makeGithub()
    const marketplace = makeMarketplace(github)
    marketplace.pluginStats = {
      'test.plugin': {
        downloads: 0,
        updated: 0,
        size: 0,
        'v1.0.0': 1,
        '1.2.0': 1,
        notes: 1,
      },
    }

    await expect(marketplace.getPluginNewestVersion(makePlugin())).resolves.toBe('1.2.0')
    expect(github.getReleaseInfo).not.toHaveBeenCalled()
  })

  test('getPluginNewestVersion falls back to the latest GitHub release', async () => {
    const github = makeGithub()
    const marketplace = makeMarketplace(github)

    await expect(marketplace.getPluginNewestVersion(makePlugin())).resolves.toBe('9.9.9')
    expect(github.getReleaseInfo).toHaveBeenCalledWith(REPO)
  })

  test('loadCommunityPluginStats stores the response', async () => {
    const stats = { a: { downloads: 1, updated: 2, size: 3 } }
    const marketplace = makeMarketplace(makeGithub({
      getJSON: vi.fn(async () => stats),
    }))

    await expect(marketplace.loadCommunityPluginStats()).resolves.toBe(stats)
    expect(marketplace.pluginStats).toBe(stats)
  })

  test('loadCommunityPluginStats tolerates empty and failed responses', async () => {
    const empty = makeMarketplace(makeGithub({ getJSON: vi.fn(async () => null) }))
    await empty.loadCommunityPluginStats()
    expect(empty.pluginStats).toEqual({})

    const failed = makeMarketplace(makeGithub({
      getJSON: vi.fn(async () => { throw new Error('offline') }),
    }))
    await failed.loadCommunityPluginStats()
    expect(failed.pluginStats).toEqual({})
  })
})


describe('PluginMarketplace README loading', () => {

  test('finds a localized README on the default branch and caches it', async () => {
    const github = makeGithub({
      getDefaultBranch: vi.fn(async () => 'develop'),
      getFileText: vi.fn(async (_repo: string, _branch: string, filepath: string) => {
        if (filepath === 'README.zh-CN.md') return ''
        if (filepath === 'README.md') return '# docs'
        return undefined
      }),
    })
    const marketplace = makeMarketplace(github)
    const info = makePlugin()

    const first = await marketplace.getPluginReadme(info)
    const second = await marketplace.getPluginReadme(info)

    expect(first).toEqual({ md: '# docs', branch: 'develop', filepath: 'README.md' })
    expect(second).toBe(first)
    expect(github.getDefaultBranch).toHaveBeenCalledTimes(1)
    expect(github.getFileText.mock.calls.map(([, , file]) => file))
      .toEqual(['README.zh-CN.md', 'README.md'])
  })

  test('handles language-only locales', async () => {
    const github = makeGithub({
      getFileText: vi.fn(async (_repo: string, _branch: string, filepath: string) =>
        filepath === 'README.zh.md' ? '# 中文' : undefined),
    })
    const marketplace = makeMarketplace(github, 'zh')

    await expect(marketplace.getPluginReadme(makePlugin()))
      .resolves.toEqual({ md: '# 中文', branch: 'main', filepath: 'README.zh.md' })
  })

  test('does not request localized READMEs for English', async () => {
    const github = makeGithub({
      getFileText: vi.fn(async (_repo: string, _branch: string, _filepath: string) => '# en' as string | undefined),
    })
    const marketplace = makeMarketplace(github, 'en')

    await marketplace.getPluginReadme(makePlugin())

    expect(github.getFileText.mock.calls.map(([, , file]) => file))
      .toEqual(['README.md'])
  })

  test('falls back to main when the default branch request fails', async () => {
    const github = makeGithub({
      getDefaultBranch: vi.fn(async () => { throw new Error('api down') }),
      getFileText: vi.fn(async (_repo: string, branch: string) =>
        branch === 'main' ? '# main' : undefined),
    })
    const marketplace = makeMarketplace(github) as any

    await expect(marketplace.getPluginReadme(makePlugin()))
      .resolves.toMatchObject({ branch: 'main' })

    expect(marketplace.logger.warn).toHaveBeenCalled()
  })

  test('resolves undefined when no README variant exists', async () => {
    const marketplace = makeMarketplace(makeGithub())

    await expect(marketplace.getPluginReadme(makePlugin())).resolves.toBeUndefined()
  })

  test('clearReadmeCache forces a refetch', async () => {
    const github = makeGithub({ getFileText: vi.fn(async () => '# doc') })
    const marketplace = makeMarketplace(github)

    await marketplace.getPluginReadme(makePlugin())
    marketplace.clearReadmeCache()
    await marketplace.getPluginReadme(makePlugin())

    expect(github.getDefaultBranch).toHaveBeenCalledTimes(2)
  })
})


describe('PluginMarketplace.installPlugin()', () => {

  const manifest = { id: 'test.plugin', name: 'Test Plugin' }

  beforeEach(() => {
    vi.mocked(fs.readTextSync).mockReset().mockReturnValue(JSON.stringify(manifest))
    vi.mocked(fs.remove).mockClear()
    vi.mocked(fs.mkdir).mockClear()
    vi.mocked(fs.trash).mockClear()
    vi.mocked(fs.move).mockClear()
    vi.spyOn(Notice, 'error').mockImplementation(() => ({}) as any)
  })

  function makeInstaller(overrides: Record<string, any> = {}) {
    const github = makeGithub(overrides)
    const market = makeMarketplace(github, 'en', {}, {
      globalPluginsDir: '/global-plugins',
      vaultPluginsDir: '/vault-plugins',
    })
    return { github, market }
  }

  test('installs a global plugin into the global plugins directory', async () => {
    const { github, market } = makeInstaller()

    await market.installPlugin(makePlugin(), 'global')

    expect(github.downloadThenUnzipToTemp).toHaveBeenCalledWith(REPO, '9.9.9', 'plugin.zip')
    expect(fs.readTextSync).toHaveBeenCalledWith('/tmp/unzipped/manifest.json')
    expect((market as any).plugins.manifests['test.plugin']).toMatchObject({
      position: 'global',
      dir: '/global-plugins/test.plugin',
    })
    expect(fs.mkdir).toHaveBeenCalledWith('/global-plugins/test.plugin')
    expect(fs.trash).toHaveBeenCalledWith('/global-plugins/test.plugin')
    expect(fs.move).toHaveBeenCalledWith('/tmp/unzipped', '/global-plugins/test.plugin')
  })

  test('installs a vault plugin into the vault plugins directory', async () => {
    const { market } = makeInstaller()

    await market.installPlugin(makePlugin(), 'vault')

    expect((market as any).plugins.manifests['test.plugin'].dir).toBe('/vault-plugins/test.plugin')
    expect(fs.move).toHaveBeenCalledWith('/tmp/unzipped', '/vault-plugins/test.plugin')
  })

  test('rejects and cleans up when the manifest id does not match', async () => {
    vi.mocked(fs.readTextSync).mockReturnValue(JSON.stringify({ id: 'other.plugin' }))
    const { market } = makeInstaller()

    await expect(market.installPlugin(makePlugin(), 'global'))
      .rejects.toThrow('id not correct')

    expect(fs.remove).toHaveBeenCalledWith('/tmp/unzipped')
    expect(fs.move).not.toHaveBeenCalled()
    expect(Notice.error).toHaveBeenCalledWith('id not correct')
  })

  test('logs and rethrows download failures', async () => {
    const { market } = makeInstaller({
      getReleaseInfo: vi.fn(async () => { throw new Error('no release') }),
    })
    const logger = (market as any).logger

    await expect(market.installPlugin(makePlugin(), 'global'))
      .rejects.toThrow('no release')

    expect(logger.error).toHaveBeenCalledWith(expect.any(Error))
    expect(Notice.error).toHaveBeenCalledWith('no release')
  })
})
