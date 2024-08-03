import './global.scss'
import './variables.scss'
import path from 'src/path'
import { JSBridge, _options, editor } from 'typora'
import * as Core from '.'
import { Events } from 'src/common/events'
import { GithubAPI } from 'src/net/github'
import { HotkeyManager } from 'src/hotkey-manager'
import fs from 'src/io/fs/filesystem'
import { Vault } from "src/io/vault"
import { CommandManager } from 'src/command/command-manager'
import { I18n } from 'src/locales/i18n'
import * as Locale from 'src/locales/lang.en.json'
import { PluginManager } from "src/plugin/plugin-manager"
import { Settings } from 'src/settings/settings'
import type { FileLinkSettings } from 'src/settings/setting-tabs/file-link-setting-tab'
import type { AppearanceSettings } from 'src/settings/setting-tabs/appearance-setting-tab'
import type { PluginMarketplaceSettings } from 'src/settings/setting-tabs/plugin-marketplace-setting-tab'
import type { CoreSettings } from 'src/settings/setting-tabs/about-tab'
import { Workspace } from 'src/ui/workspace'
import type { RibbonSettings } from 'src/ui/ribbon/workspace-ribbon'
import { isMarkdownUrl } from 'src/utils/string/is-markdown-url'
import { platform } from 'src/utils/platform'
import type { FileURL } from 'src/utils/types'
import { _emitMissingEvents } from 'src/symbols'
import { GlobalSearch } from './ui/sidebar/search/global-search'


type AppEvents = {
  'load'(): void
}

type EnvironmentVairables = {
  TYPORA_EXTENSION_ENV?: "development"
  PLUGIN_CORE_PATH?: string
  PLUGIN_GLOBAL_DIR?: string
  PLUGIN_WIN_ID?: string

  [key: string]: any
}

type AppSettings = FileLinkSettings & AppearanceSettings & PluginMarketplaceSettings & CoreSettings & RibbonSettings

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
  get coreVersion() {
    return process.env.CORE_VERSION
  }

  get coreDir() {
    return process.env.IS_DEV
      ? import.meta.url.slice(8, -7)
      : path.join(_options.userDataPath, 'plugins', this.coreVersion)
  }

  readonly platform = platform()

  vault: Vault
  settings: Settings<AppSettings>
  i18n: I18n<typeof Locale>
  commands: CommandManager
  env: EnvironmentVairables
  github: GithubAPI
  plugins: PluginManager
  workspace: Workspace
  hotkeyManager: HotkeyManager

  features = {
    globalSearch: new GlobalSearch(this)
  }

  constructor() {
    super()

    // @ts-ignore
    window[Symbol.for(process.env.CORE_NS)] = {
      app: this,
      ...Core,
    }
    if (process.env.IS_DEV) {
      // @ts-ignore
      window['Typora'] = window[Symbol.for(process.env.CORE_NS)]
    }

    this.vault = new Vault()

    this.settings = new Settings<AppSettings>(this.vault, {
      filename: 'core',
      version: 1,
    })

    this.i18n = new I18n<typeof Locale>({
      localePath: path.join(this.coreDir, 'locales'),
      userLang: this.settings.get('displayLang'),
    })

    I18n.setUserLocale(this.i18n.locale)

    this.commands = new CommandManager(this)

    this.env = this._readEnv()

    this.github = new GithubAPI(this)

    this.plugins = new PluginManager(this)

    this.workspace = new Workspace(this)

    this.hotkeyManager = new HotkeyManager(this)

    this.once('load', () => {
      this.vault[_emitMissingEvents]()
      this.workspace[_emitMissingEvents]()
    })
    this.vault.on('change', () => {
      this.env = this._readEnv()
      this.settings.load()
      this.plugins.unloadPlugins()
      this.start()
    })

    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" id="typora-plugin-core" href="file://${path.join(this.coreDir, 'core.css')}" crossorigin="anonymous"></link>`)
  }

  private _readEnv(): EnvironmentVairables {
    return this.vault.readConfigJson('env')
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
