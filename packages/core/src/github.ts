import * as extract from "extract-zip"
import * as _ from 'lodash'
import * as path from 'path'
import { File, JSBridge, _options } from 'typora'
import type { App } from "src/app"
import fs from 'src/fs/filesystem'
import { format } from "src/utils/format"
import { Shell } from 'src/utils/shell'


interface GithubProxy {
  id: string
  base: string
  raw: string
  api: string
}

const github: GithubProxy = {
  id: 'github',
  base: 'https://github.com/',
  raw: 'https://raw.githubusercontent.com/',
  api: 'https://api.github.com/',
}

const ghproxy: GithubProxy = {
  ...github,
  id: 'ghproxy',
  base: 'https://ghproxy.com/' + github.base,
  raw: 'https://ghproxy.com/' + github.raw,
}

export class GithubAPI {

  proxies: GithubProxy[] = [github, ghproxy]

  private uri: GithubProxy

  constructor(app: App) {
    this.uri = this.getUri(app.settings.get('githubProxy'))

    app.settings.onChange('githubProxy', (_, id) => {
      this.uri = this.getUri(id)
    })
  }

  private getUri(id = 'github') {
    return this.proxies.find(uri => uri.id === id)
  }

  getFile(repo: string, branch: string, filepath: string) {
    const uri = this.uri.raw + '{repo}/{branch}/{filepath}'
    return fetch(format(uri, { repo, branch, filepath }))
  }

  getReleaseInfo(repo: string) {
    const uri = this.uri.api + 'repos/{repo}/releases/latest'
    return fetch(format(uri, { repo }))
      .then(res => res.json())
  }

  /**
   * Download release asset
   */
  downloadThenUnzipToTemp(repo: string, id: string, asset: string) {
    const uri = this.uri.base + '{repo}/releases/download/{id}/{asset}'
    const url = format(uri, { repo, id, asset })
    const tmpDir = path.join(_options.userDataPath, 'plugins', '.tmp')
    const tmpDirname = _.uniqueId()
    const tmpFilename = `${tmpDirname}.zip`
    const tmpZippath = path.join(tmpDir, tmpFilename)
    const tmp = path.join(tmpDir, tmpDirname)

    if (File.isNode) {
      return fs.mkdir(tmpDir)
        .then(() => JSBridge.invoke('app.download', url, tmpDir, tmpFilename))
        .then(() => new Promise<void>((resolve, reject) => {
          extract(tmpZippath, { dir: tmp }, (err) => {
            err ? reject(err) : resolve()
          })
        }))
        .then(() => fs.remove(tmpZippath))
        .then(() => tmp)
    }
    else {
      return Shell.run(`curl '${url}' | unzip -d '${tmp}'`)
        .then(() => tmp)
    }
  }
}
