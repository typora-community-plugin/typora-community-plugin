import { _options } from 'typora'
import { useService } from 'src/common/service'
import { Notice } from 'src/ui/components/notice'
import { format } from "src/utils"
import * as net from './net'


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

  constructor(
    settings = useService('settings'),
    i18n = useService('i18n')
  ) {

    const getUri = (id = 'github') => {
      const uri = this.proxies.find(uri => uri.id === id)

      if (!uri) {
        // to wait css loaded
        setTimeout(() => new Notice(i18n.t.githubAPI.proxyNotFound), 5e3)
        settings.set('githubProxy', 'github')
        return github
      }

      return uri
    }

    this.uri = getUri(settings.get('githubProxy'))

    settings.onChange('githubProxy', (_, id) => {
      this.uri = getUri(id)
    })
  }

  getFile(repo: string, branch: string, filepath: string) {
    const uri = this.uri.raw + '{repo}/{branch}/{filepath}'
    return fetch(format(uri, { repo, branch, filepath }))
  }

  /**
   * @returns JSON Object
   * @example
   * app.github.getJSON('typora-community-plugin/typora-plugin-releases', 'main', 'community-plugins.json')
   */
  getJSON(repo: string, branch: string, filepath: string) {
    return this.getFile(repo, branch, filepath)
      .then(res => res.json())
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
    return net.downloadThenUnzipToTemp(url)
  }
}
