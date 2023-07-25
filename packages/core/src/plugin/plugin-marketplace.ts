import * as fs from 'fs/promises'
import * as path from 'path'
import { format } from "../utils/format"
import type { PluginManifest } from "./plugin-manifest"
import type { App } from '../app'
import { unzipFromBuffer } from '../utils/unzip'


export type PluginMarketInfo = Pick<PluginManifest, "id" | "name" | "description" | "author"> & {
  repo: string
}

interface GithubUri {
  id: string
  host: string
  path: string
}

export class PluginMarketplace {

  private pluginListUris: GithubUri[] = [{
    id: 'github',
    host: 'https://raw.githubusercontent.com/',
    path: 'typora-community-plugin/typora-plugin-releases/main/community-plugins.json'
  }, {
    id: 'jsdelivr',
    host: 'https://fastly.jsdelivr.net/gh/',
    path: 'typora-community-plugin/typora-plugin-releases@latest/community-plugins.json'
  }]

  private releaseUris: GithubUri[] = [{
    id: 'github',
    host: 'https://api.github.com/',
    path: 'repos/{repo}/releases/latest'
  }]

  private downloadUris: GithubUri[] = [{
    id: 'github',
    host: 'https://github.com/',
    path: '{repo}/releases/download/{version}/plugin.zip'
  }, {
    id: 'ghproxy',
    host: 'https://ghproxy.com/https://github.com/',
    path: '{repo}/releases/download/{version}/plugin.zip'
  }]

  private activeUri = {
    pluginList: this.pluginListUris[0],
    release: this.releaseUris[0],
    download: this.downloadUris[0],
  }

  constructor(private app: App) {
    this.activeUri.pluginList = getUri(this.pluginListUris, app.settings.get('githubPluginListUri'))
    this.activeUri.download = getUri(this.downloadUris, app.settings.get('githubDownloadUri'))

    app.settings.onChange('githubPluginListUri', (_, id) => {
      this.activeUri.pluginList = getUri(this.pluginListUris, id)
    })
    app.settings.onChange('githubDownloadUri', (_, id) => {
      this.activeUri.download = getUri(this.downloadUris, id)
    })

    function getUri(list: GithubUri[], id: string) {
      return list.find(uri => uri.id === id)!
    }
  }

  loadCommunityPlugins(): Promise<PluginMarketInfo[]> {
    const url = this.activeUri.pluginList.host
      + this.activeUri.pluginList.path
    return fetch(url)
      .then(res => res.json())
  }

  installPlugin(info: PluginMarketInfo, pos: 'global' | 'vault') {
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
              throw Error('Downloaded plugin id is not equal to user install plugin id.')
            }
            else {
              this.app.plugins.manifests[manifest.id] = manifest
            }
          })
      })
  }

  downloadPlugin(info: PluginMarketInfo) {
    const url = this.activeUri.release.host
      + format(this.activeUri.release.path, info)
    return fetch(url)
      .then(res => res.json())
      .then(data => data.tag_name)
      .then(version => {
        const url = this.activeUri.download.host
          + format(this.activeUri.download.path, { repo: info.repo, version })
        return fetch(url)
          .then(res => res.arrayBuffer())
      })
  }
}
