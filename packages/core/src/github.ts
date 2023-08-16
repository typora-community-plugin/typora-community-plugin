import type { App } from "src/app"
import { format } from "src/utils/format"


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
  download(repo: string, id: string, asset: string) {
    const uri = this.uri.base + '{repo}/releases/download/{id}/{asset}'
    return fetch(format(uri, { repo, id, asset }))
  }
}
