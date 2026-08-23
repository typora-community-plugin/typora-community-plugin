import { File, reqnode } from 'typora'
import { platform } from './common/constants'


interface INodeOs {
  arch(): string
  homedir(): string
  hostname(): string
  platform(): NodeJS.Platform
  type(): 'Darwin' | 'Linux' | 'Windows'
}

class BrowserOs implements INodeOs {

  arch(): string {
    const ua = navigator.userAgent
    if (/arm/gi.test(ua) || /iPhone|iPad|iPod/i.test(ua)) return 'arm64'
    if (/x86_64|x86-64|amd64|Win64|WOW64/i.test(ua)) return 'x64'
    if (/i[3-6]86|x86/i.test(ua)) return 'ia32'
    return 'x64'
  }

  homedir(): string {
    const loaderScriptEl = document.querySelector('script[src^="file:///Users/"]')
    if (!loaderScriptEl) throw Error('Can not get homedir.')
    return loaderScriptEl.getAttribute('src')!.match(/(\/Users\/[^\/]+)\//)![1]
  }

  hostname(): string {
    return navigator.userAgent || 'browser'
  }

  platform(): NodeJS.Platform {
    return platform()
  }

  type(): 'Darwin' | 'Linux' | 'Windows' {
    const p = this.platform()
    if (p === 'win32') return 'Windows'
    if (p === 'darwin') return 'Darwin'
    return 'Linux'
  }
}

const os: INodeOs = File.isNode ? reqnode('os') : new BrowserOs()

export default os
