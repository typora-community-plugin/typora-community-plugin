import path from 'src/path'
import { useService } from 'src/common/service'
import { Notice } from 'src/ui/components/notice'
import fs from 'src/io/fs/filesystem'
import type { PluginManifest, PluginPostion } from "./plugin-manifest"


export type PluginMarketInfo = Pick<PluginManifest, "id" | "name" | "description" | "author" | "repo" | "platforms"> & {
  newestVersion?: string
}

export class PluginMarketplace {

  pluginList: PluginMarketInfo[] = []

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
    return info.newestVersion
      ? Promise.resolve(info.newestVersion)
      : this.github.getReleaseInfo(info.repo)
        .then(data => data.tag_name)
  }

  loadCommunityPlugins(): Promise<PluginMarketInfo[]> {
    return this.github.getJSON('typora-community-plugin/typora-plugin-releases', 'main', 'community-plugins.json')
      .then(res => this.pluginList = res ?? [])
  }

  installPlugin(info: PluginMarketInfo, pos: PluginPostion) {
    return this.getPluginNewestVersion(info)
      .then(version => this.github.downloadThenUnzipToTemp(info.repo, version, 'plugin.zip'))
      .then(tmp => {
        const dir = pos === 'global'
          ? this.plugins.globalPluginsDir
          : this.plugins.vaultPluginsDir
        const root = path.join(dir, info.id)

        return Promise.resolve()
          .then(() => fs.readTextSync(path.join(tmp, 'manifest.json')))
          .then(text => JSON.parse(text) as PluginManifest)
          .then(manifest => {
            if (info.id !== manifest.id) {
              fs.remove(tmp)
              new Notice(this.i18n.t.pluginMarketplace.idNotCorrect)
            }
            else {
              manifest.postion = pos
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
        new Notice(error.message)
      })
  }
}
