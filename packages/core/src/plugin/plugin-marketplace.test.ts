import 'src/setup-test-env'
import { jest, describe, expect, test } from '@jest/globals'
import { PluginMarketplace } from './plugin-marketplace'
import type { PluginMarketInfo, PluginStat } from './plugin-marketplace'

const REPO = 'typora-community-plugin/typora-plugin-releases'
const BRANCH = 'main'

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

function makeMarketplace(getJSON: jest.Mock, locale = 'zh-cn') {
  const logger = { debug() { }, info() { }, warn: jest.fn(), error: jest.fn() } as any
  return new PluginMarketplace(
    logger,
    { locale } as any,
    { getJSON } as any,
    { manifests: {} } as any,
  )
}

describe('PluginMarketplace.loadCommunityPlugins()', () => {
  test('should use the locale-specific list file when available', async () => {
    const zhList = [makePlugin({ name: '测试插件' })]

    const getJSON = jest.fn(async (_repo: string, _branch: string, filepath: string) => {
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

    const getJSON = jest.fn(async (_repo: string, _branch: string, filepath: string) => {
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

    const getJSON = jest.fn(async (_repo: string, _branch: string, filepath: string) => {
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

    const getJSON = jest.fn(async (_repo: string, _branch: string, filepath: string) => {
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
    const getJSON = jest.fn(async (_repo: string, _branch: string, filepath: string) => {
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

    const getJSON = jest.fn(async (_repo: string, _branch: string, filepath: string) => {
      if (filepath === `community-plugins.zh-cn.json`) return zhList
      if (filepath === 'community-plugin-stats.json') return stats
      throw new Error('unexpected file: ' + filepath)
    })

    const marketplace = makeMarketplace(getJSON, 'zh-cn')
    await marketplace.loadCommunityPlugins()

    expect(marketplace.pluginList[0].newestVersion).toBe('1.2.3')
  })
})
