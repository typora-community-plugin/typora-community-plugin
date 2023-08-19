import * as fs from 'fs/promises'
import * as path from 'path'
import type { App } from 'src/app'
import { Notice } from 'src/components/notice'
import { unzipFromBuffer } from 'src/utils/unzip'
import type { PluginManifest, PluginPostion } from "./plugin-manifest"


export type PluginMarketInfo = Pick<PluginManifest, "id" | "name" | "description" | "author"> & {
  repo: string
}

export class PluginMarketplace {

  pluginList: PluginMarketInfo[] = []

  constructor(private app: App) {
  }

  loadCommunityPlugins(): Promise<PluginMarketInfo[]> {
    return this.app.github.getFile('typora-community-plugin/typora-plugin-releases', 'main', 'community-plugins.json')
      .then(async res => this.pluginList = await res.json() ?? [] as any)
  }

  installPlugin(info: PluginMarketInfo, pos: PluginPostion) {
    return this.downloadPlugin(info)
      .then(arrBuf => {
        const buf = Buffer.from(arrBuf)
        const dir = pos === 'global'
          ? this.app.plugins.globalPluginsDir
          : this.app.plugins.vaultPluginsDir
        const root = path.join(dir, info.id)

        return fs.mkdir(root, { recursive: true })
          .then(() => unzipFromBuffer(buf, root))
          .then(() => fs.readFile(path.join(root, 'manifest.json'), 'utf8'))
          .then(text => JSON.parse(text) as PluginManifest)
          .then(manifest => {
            if (info.id !== manifest.id) {
              fs.rm(root, { recursive: true })
              new Notice(this.app.i18n.t.pluginMarketplace.idNotCorrect)
            }
            else {
              manifest.dir = root
              this.app.plugins.manifests[manifest.id] = manifest
            }
          })
      })
  }

  downloadPlugin(info: PluginMarketInfo) {
    return this.app.github.getReleaseInfo(info.repo)
      .then(data => data.tag_name)
      .then(version => {
        return this.app.github.download(info.repo, version, 'plugin.zip')
          .then(res => res.arrayBuffer())
      })
  }
}
