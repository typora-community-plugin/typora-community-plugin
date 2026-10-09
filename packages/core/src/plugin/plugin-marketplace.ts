import path from 'src/path'
import { useService } from 'src/common/service'
import { Events } from 'src/common/events'
import { Notice } from 'src/ui/components/notice'
import fs from 'src/io/fs/filesystem'
import type { PluginManifest, PluginPosition } from "./plugin-manifest"
import * as versions from "src/utils/versions"


export type PluginMarketInfo = Pick<PluginManifest, "id" | "name" | "description" | "author" | "repo" | "platforms"> & {
  newestVersion?: string
}

export type PluginStat = {
  downloads: number
  updated: number
  size: number
  [version: string]: number | undefined
}

export type PluginReadme = {
  md: string
  branch: string
  filepath: string
}

export class PluginMarketplace extends Events<{ 'stats:loaded'(): void }> {

  pluginList: PluginMarketInfo[] = []
  pluginStats: Record<string, PluginStat> = {}

  private _readmeCache = new Map<string, Promise<PluginReadme | undefined>>()

  get isLoaded() {
    return !!this.pluginList.length
  }

  constructor(
    protected logger = useService('logger', ['PluginMarketplace']),
    private i18n = useService('i18n'),
    private github = useService('github'),
    private plugins = useService('plugin-manager'),
  ) {
    super()
  }

  getPlugin(id: string) {
    return this.pluginList.find(p => p.id === id)
  }

  async getPluginNewestVersion(info: PluginMarketInfo) {
    if (info.newestVersion) return info.newestVersion

    const statsVersion = this.getStatsNewestVersion(info.id)
    if (statsVersion) return statsVersion

    return this.github.getReleaseInfo(info.repo)
      .then(data => data.tag_name)
  }

  loadCommunityPlugins(): Promise<void> {
    return Promise.all([
      this.loadCommunityPluginList(),
      this.loadCommunityPluginStats(),
    ]).then(() => this.markUpdatesAvailable())
  }

  private async loadCommunityPluginList(): Promise<void> {
    const repo = 'typora-community-plugin/typora-plugin-releases';
    const branch = 'main';
    const locale = this.i18n.locale.toLowerCase();

    const fileNames = locale && locale !== 'en'
      ? [`community-plugins.${locale}.json`, 'community-plugins.json']
      : ['community-plugins.json'];

    for (const fileName of fileNames) {
      try {
        const list = await this.github.getJSON<PluginMarketInfo[]>(repo, branch, fileName);
        if (Array.isArray(list) && list.length > 0) {
          this.pluginList = list;
          return;
        }
        this.logger.warn(`Failed to load ${fileName}.`);
      } catch (error) {
        this.logger.warn(`Failed to load ${fileName}.`);
      }
    }

    this.logger.error('Failed to load community plugin list.');
  }

  private markUpdatesAvailable() {
    for (const info of this.pluginList) {
      const newestVersion = this.getStatsNewestVersion(info.id)
      if (newestVersion) {
        info.newestVersion = newestVersion
      } else {
        delete info.newestVersion
      }
    }
  }

  private getStatsNewestVersion(id: string): string | undefined {
    const stats = this.pluginStats[id]
    if (!stats) return

    let newest: string | undefined
    for (const key of Object.keys(stats)) {
      const version = key.replace(/^v/i, '')
      if (/^\d/.test(version) && (!newest || versions.compare(newest, version) < 0)) {
        newest = version
      }
    }
    return newest
  }

  /**
   * Get the README.md content of a plugin repository.
   * Resolves `undefined` when no README is found or the request fails.
   */
  getPluginReadme(info: PluginMarketInfo): Promise<PluginReadme | undefined> {
    const key = info.repo
    if (!this._readmeCache.has(key)) {
      this._readmeCache.set(key, this.fetchReadme(key))
    }
    return this._readmeCache.get(key)!
  }

  clearReadmeCache() {
    this._readmeCache.clear()
  }

  private readmeFilepaths(): string[] {
    const paths: string[] = []
    const locale = this.i18n.locale.toLowerCase()
    if (locale && locale !== 'en') {
      const [lang, region] = locale.split('-')
      const suffix = lang + (region ? `-${region.toUpperCase()}` : '')
      paths.push(`README.${suffix}.md`)
    }
    return [...paths, 'README.md', 'readme.md', 'Readme.md']
  }

  private async fetchReadme(repo: string): Promise<PluginReadme | undefined> {
    let branch = 'main'
    try {
      const defaultBranch = await this.github.getDefaultBranch(repo)
      if (defaultBranch) branch = defaultBranch
    } catch (error) {
      this.logger.warn(`Failed to get default branch of ${repo}.`)
    }

    for (const filepath of this.readmeFilepaths()) {
      const md = await this.github.getFileText(repo, branch, filepath)
      if (md) return { md, branch, filepath }
    }
  }

  loadCommunityPluginStats(): Promise<Record<string, PluginStat>> {
    return this.github.getJSON('typora-community-plugin/typora-plugin-releases', 'main', 'community-plugin-stats.json')
      .then(res => this.pluginStats = res ?? {} as any)
      .catch(() => this.pluginStats = {})
      .finally(() => this.emit('stats:loaded'))
  }

  installPlugin(info: PluginMarketInfo, position: PluginPosition) {
    const t = this.i18n.t.pluginMarketplace
    return this.getPluginNewestVersion(info)
      .then(version => this.github.downloadThenUnzipToTemp(info.repo, version, 'plugin.zip'))
      .then(tmp => {
        const dir = position === 'global'
          ? this.plugins.globalPluginsDir
          : this.plugins.vaultPluginsDir
        const root = path.join(dir, info.id)

        return Promise.resolve()
          .then(() => fs.readTextSync(path.join(tmp, 'manifest.json')))
          .then(text => JSON.parse(text) as PluginManifest)
          .then(manifest => {
            if (info.id !== manifest.id) {
              fs.remove(tmp)
              throw new Error(t.idNotCorrect)
            }
            else {
              manifest.position = position
              manifest.dir = root
              this.plugins.manifests[manifest.id] = manifest

              return fs.mkdir(root)
                .then(() => fs.trash(root))
                .then(() => fs.move(tmp, root))
            }
          })
      })
      .catch(error => {
        this.logger.error(error)
        Notice.error(error.message)
        throw error
      })
  }
}
