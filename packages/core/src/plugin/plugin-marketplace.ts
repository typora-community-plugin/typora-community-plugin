import path from 'src/path'
import type { App } from 'src/app'
import { Notice } from 'src/components/notice'
import fs from 'src/fs/filesystem'
import { Logger } from 'src/logger'
import type { PluginManifest, PluginPostion } from "./plugin-manifest"


const logger = new Logger('PluginMarketplace')


export type PluginMarketInfo = Pick<PluginManifest, "id" | "name" | "description" | "author" | "repo" | "platforms"> & {
  newestVersion?: string
}

export class PluginMarketplace {

  pluginList: PluginMarketInfo[] = []

  get isLoaded() {
    return !!this.pluginList.length
  }

  constructor(private app: App) {
  }

  getPlugin(id: string) {
    return this.pluginList.find(p => p.id === id)
  }

  getPluginNewestVersion(info: PluginMarketInfo) {
    return info.newestVersion
      ? Promise.resolve(info.newestVersion)
      : this.app.github.getReleaseInfo(info.repo)
        .then(data => data.tag_name)
  }

  loadCommunityPlugins(): Promise<PluginMarketInfo[]> {
    return this.app.github.getJSON('typora-community-plugin/typora-plugin-releases', 'main', 'community-plugins.json')
      .then(res => this.pluginList = res ?? [])
  }

  installPlugin(info: PluginMarketInfo, pos: PluginPostion) {
    return this.getPluginNewestVersion(info)
      .then(version => this.app.github.downloadThenUnzipToTemp(info.repo, version, 'plugin.zip'))
      .then(tmp => {
        const dir = pos === 'global'
          ? this.app.plugins.globalPluginsDir
          : this.app.plugins.vaultPluginsDir
        const root = path.join(dir, info.id)

        return fs.readText(path.join(tmp, 'manifest.json'))
          .then(text => JSON.parse(text) as PluginManifest)
          .then(manifest => {
            if (info.id !== manifest.id) {
              fs.remove(tmp)
              new Notice(this.app.i18n.t.pluginMarketplace.idNotCorrect)
            }
            else {
              manifest.postion = pos
              manifest.dir = root
              this.app.plugins.manifests[manifest.id] = manifest

              return fs.mkdir(dir)
                .then(() => fs.trash(root))
                .then(() => fs.move(tmp, root))
            }
          })
      })
      .catch(error => {
        logger.error(error)
        new Notice(error.message)
      })
  }
}
