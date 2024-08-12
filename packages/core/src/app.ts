import './ui/variables.scss'
import './ui/global.scss'
import path from 'src/path'
import { JSBridge, _options, editor } from 'typora'
import * as Core from '.'
import { coreDir, coreVersion, platform } from 'src/common/constants'
import { Events } from 'src/common/events'
import { useService } from 'src/common/service'
import type { GithubAPI } from 'src/net/github'
import type { HotkeyManager } from 'src/hotkey-manager'
import fs from 'src/io/fs/filesystem'
import type { Vault } from "src/io/vault"
import type { CommandManager } from 'src/command/command-manager'
import type { I18n } from 'src/locales/i18n'
import * as Locale from 'src/locales/lang.en.json'
import type { PluginManager } from "src/plugin/plugin-manager"
import type { Settings } from 'src/settings/settings'
import type { FileLinkSettings } from 'src/ui/settings/tabs/file-link-setting-tab'
import type { AppearanceSettings } from 'src/ui/settings/tabs/appearance-setting-tab'
import type { PluginMarketplaceSettings } from 'src/ui/settings/tabs/plugin-marketplace-setting-tab'
import type { CoreSettings } from 'src/ui/settings/tabs/about-tab'
import type { Workspace } from 'src/ui/workspace'
import type { RibbonSettings } from 'src/ui/ribbon/workspace-ribbon'
import { GlobalSearch } from './ui/sidebar/search/global-search'
import { isMarkdownUrl } from 'src/utils/string/is-markdown-url'
import type { FileURL } from 'src/utils/types'
import { _emitMissingEvents } from 'src/symbols'


export type AppEvents = {
  'load'(): void
}

export type EnvironmentVairables = {
  PLUGIN_CORE_PATH?: string
  PLUGIN_GLOBAL_DIR?: string
  PLUGIN_WIN_ID?: string

  [key: string]: any
}

export type AppSettings =
  FileLinkSettings
  & AppearanceSettings
  & PluginMarketplaceSettings
  & CoreSettings
  & RibbonSettings

export type AppPlugin = (app: App) => void


/**
 * Proxy of Typora
 *
 * Use in development environment:
 * @example
 * ```ts
 * const { app } = Typora
 * ```
 *
 * Use in production environment:
 * @example const { app } = pliginInstance
 * @example import { app } from '@typora-community-plugin/core'
 */
export class App extends Events<AppEvents> {

  /**
   * @example app.coreVersion  //=> '2.0.0'
   */
  readonly coreVersion = coreVersion()

  readonly coreDir = coreDir()

  readonly platform = platform()

  vault: Vault = useService('vault')
  settings: Settings<AppSettings> = useService('settings')
  i18n: I18n<typeof Locale> = useService('i18n')
  env: EnvironmentVairables = useService('env')
  github: GithubAPI = useService('github')
  hotkeyManager: HotkeyManager = useService('hotkey-manager')
  commands: CommandManager = useService('command-manager')
  plugins: PluginManager = useService('plugin-manager')
  workspace: Workspace = useService('workspace')

  features = {
    globalSearch: new GlobalSearch()
  }

  constructor() {
    super('app')

    // @ts-ignore
    window[Symbol.for(process.env.CORE_NS)] = {
      app: this,
      ...Core,
    }
    if (process.env.IS_DEV) {
      // @ts-ignore
      window['Typora'] = window[Symbol.for(process.env.CORE_NS)]
    }

    this.once('load', () => {
      this.vault[_emitMissingEvents]()
      this.workspace[_emitMissingEvents]()
    })
    this.vault.on('change', () => {
      this.env = useService('env')
      this.settings.load()
      this.plugins.unloadPlugins()
      this.start()
    })

    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" id="typora-plugin-core" href="file://${path.join(this.coreDir, 'core.css')}" crossorigin="anonymous"></link>`)
  }

  use(plugin: AppPlugin) {
    plugin(this)
    return this
  }

  async start() {
    await this.plugins.loadFromVault()

    this.emit('load')
  }

  /**
   * @param link HTTP url or file path
   */
  openLink(link: string) {
    if (link.startsWith('http') || link.startsWith('#')) {
      editor.tryOpenUrl(link)
    }
    else {
      this.openFile(unescape(link))
    }
  }

  /**
   * Open Markdown file with Typora or unsupported file with default app.
   *
   * @param filepath path of Markdown file or unsuppoted file
   */
  async openFile(filepath: string) {
    if (filepath.startsWith('.')) {
      filepath = path.join(path.dirname(this.workspace.activeFile), filepath)
    }

    let url: FileURL = { pathname: filepath }
    const basename = path.basename(filepath)
    if (basename.includes('#')) {
      url = await fs.exists(filepath)
        .then(() => url)
        .catch(() => {
          const hashSplitorIdx = filepath.lastIndexOf('#')
          return {
            pathname: filepath.slice(0, hashSplitorIdx),
            hash: filepath.slice(hashSplitorIdx),
          }
        })
    }

    if (isMarkdownUrl(url.pathname)) {
      this.workspace.activeEditor.openFile(url)
    }
    else {
      this.openFileWithDefaultApp(filepath)
    }
  }

  /**
   * Open unsupported file with default app.
   *
   * @param filepath path of unsuppoted file
   */
  openFileWithDefaultApp(filepath: string) {
    JSBridge.invoke("shell.openItem", filepath)
  }
}
