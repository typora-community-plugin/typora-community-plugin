import { _options } from 'typora'
import type { App } from "src/app"
import { format } from "src/utils/format"
import { HttpClient } from './http-client'


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
  base: 'https://mirror.ghproxy.com/' + github.base,
  raw: 'https://mirror.ghproxy.com/' + github.raw,
}

const ghproxyNet: GithubProxy = {
  ...github,
  id: 'ghproxy.net',
  base: 'https://ghproxy.net/' + github.base,
  raw: 'https://ghproxy.net/' + github.raw,
}

const ghpsCc: GithubProxy = {
  ...github,
  id: 'ghps.cc',
  base: 'https://ghps.cc/' + github.base,
  raw: 'https://ghps.cc/' + github.raw,
}

export class GithubAPI {

  proxies: GithubProxy[] = [github, ghproxy, ghproxyNet, ghpsCc]

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

  getReleaseUrl(repo: string, id: string, asset: string) {
    const uri = this.uri.base + '{repo}/releases/download/{id}/{asset}'
    const url = format(uri, { repo, id, asset })
    return url
  }

  /**
   * Download release asset
   */
  downloadThenUnzipToTemp(repo: string, id: string, asset: string) {
    const url = this.getReleaseUrl(repo, id, asset)
    return HttpClient.downloadThenUnzipToTemp(url)
  }
}
