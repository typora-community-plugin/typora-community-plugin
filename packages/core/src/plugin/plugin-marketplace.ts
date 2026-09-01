import path from 'src/path'
import { useService } from 'src/common/service'
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

export class PluginMarketplace {

  pluginList: PluginMarketInfo[] = []
  pluginStats: Record<string, PluginStat> = {}

  get isLoaded() {
    return !!this.pluginList.length
  }

  constructor(
    private logger = useService('logger', ['PluginMarketplace']),
    private i18n = useService('i18n'),
    private github = useService('github'),
    private plugins = useService('plugin-manager'),
  ) {
  }

  getPlugin(id: string) {
    return this.pluginList.find(p => p.id === id)
  }

  getPluginNewestVersion(info: PluginMarketInfo) {
    return Promise.resolve(
      info.newestVersion || this.getStatsNewestVersion(info.id)
    )
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
        this.pluginList = Array.isArray(list) ? list : [];
        return;
      } catch (error) {
        this.logger.warn(`Failed to load ${fileName}.`);
      }
    }
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
    for (const version of Object.keys(stats)) {
      if (/^\d/.test(version)) {
        if (!newest || versions.compare(newest, version) < 0) {
          newest = version
        }
      }
    }
    return newest
  }

  loadCommunityPluginStats(): Promise<Record<string, PluginStat>> {
    return this.github.getJSON('typora-community-plugin/typora-plugin-releases', 'main', 'community-plugin-stats.json')
      .then(res => this.pluginStats = res ?? {})
      .catch(() => this.pluginStats = {})
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
