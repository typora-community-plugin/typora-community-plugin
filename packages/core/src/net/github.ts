import { _options } from 'typora'
import type { App } from "src/app"
import { Notice } from 'src/components/notice'
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

const ghproxyNet: GithubProxy = {
  ...github,
  id: 'ghproxy.net',
  base: 'https://ghproxy.net/' + github.base,
  raw: 'https://ghproxy.net/' + github.raw,
}

const ghproxyOrg: GithubProxy = {
  ...github,
  id: 'ghproxy.org',
  base: 'https://ghproxy.org/' + github.base,
  raw: 'https://ghproxy.org/' + github.raw,
}

const ghpsCc: GithubProxy = {
  ...github,
  id: 'ghps.cc',
  base: 'https://ghps.cc/' + github.base,
  raw: 'https://ghps.cc/' + github.raw,
}

const gh$proxyCom: GithubProxy = {
  ...github,
  id: 'gh-proxy.com',
  base: 'https://gh-proxy.com/' + github.base,
  raw: 'https://gh-proxy.com/' + github.raw,
}

const moeyyCn: GithubProxy = {
  ...github,
  id: 'moeyy.cn',
  base: 'https://moeyy.cn/gh-proxy/' + github.base,
  raw: 'https://moeyy.cn/gh-proxy/' + github.raw,
}

export class GithubAPI {

  proxies: GithubProxy[] = [github, ghproxyNet, ghproxyOrg, ghpsCc, gh$proxyCom, moeyyCn]

  private uri: GithubProxy

  constructor(app: App) {

    const getUri = (id = 'github') => {
      const uri = this.proxies.find(uri => uri.id === id)

      if (!uri) {
        // to wait css loaded
        setTimeout(() => new Notice(app.i18n.t.githubAPI.proxyNotFound), 5e3)
        app.settings.set('githubProxy', 'github')
        return github
      }

      return uri
    }

    this.uri = getUri(app.settings.get('githubProxy'))

    app.settings.onChange('githubProxy', (_, id) => {
      this.uri = getUri(id)
    })
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
   * Get Github repo release download url.
   * @param repo Gihub repo name
   * @param id realease id/tag
   * @param asset file name
   * @returns
   */
  getReleaseUrl(repo: string, id: string, asset: string) {
    const uri = this.uri.base + '{repo}/releases/download/{id}/{asset}'
    const url = format(uri, { repo, id, asset })
    return url
  }

  /**
   * Download release asset from Github repo.
   */
  downloadThenUnzipToTemp(repo: string, id: string, asset: string) {
    const url = this.getReleaseUrl(repo, id, asset)
    return HttpClient.downloadThenUnzipToTemp(url)
  }
}
