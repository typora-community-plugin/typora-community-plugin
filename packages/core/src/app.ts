import './variables.scss'
import * as path from 'path'
import { JSBridge, _options, editor } from 'typora'
import * as Core from '.'
import { Events } from './events'
import { GithubAPI } from './github'
import { HotkeyManager } from './hotkey-manager'
import fs from './vault/filesystem'
import { Vault } from "./vault/vault"
import { CommandManager } from './command/command-manager'
import { I18n } from './locales/i18n'
import * as Locale from './locales/lang.en.json'
import { PluginManager } from "./plugin/plugin-manager"
import { Settings } from './settings/settings'
import type { FileLinkSettings } from './settings/setting-tabs/file-link-setting-tab'
import type { AppearanceSettings } from './settings/setting-tabs/appearance-setting-tab'
import type { PluginMarketplaceSettings } from './settings/setting-tabs/plugin-marketplace-setting-tab'
import type { CoreSettings } from './settings/setting-tabs/about-tab'
import { Workspace } from './ui/workspace'
import type { RibbonSettings } from './ui/ribbon/workspace-ribbon'
import { isMarkdownUrl } from './utils/is-markdown-url'
import type { FileURL } from './utils/types'


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
 */
export class App extends Events<AppEvents> {

  /**
   * @example '2.0.0'
   */
  get coreVersion() {
    return process.env.CORE_VERSION
  }

  get coreDir() {
    const { url } = import.meta
    return url.startsWith('typora:')
      ? url.replace(/^typora:([\\\/])\1app\1userData/, _options.userDataPath).slice(0, -7)
      : url.slice(8, -7)
  }

  vault = new Vault(this)

  settings = new Settings<AppSettings>(this, {
    filename: 'core',
    version: 1,
  })

  i18n = new I18n<typeof Locale>({
    localePath: path.join(this.coreDir, 'locales'),
    userLang: this.settings.get('displayLang'),
  })

  commands = new CommandManager(this)

  env = this._readEnv()

  github = new GithubAPI(this)

  plugins = new PluginManager(this)

  workspace = new Workspace(this)

  hotkeyManager = new HotkeyManager(this)

  constructor() {
    super()

    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" id="typora-plugin-core" href="file://${this.coreDir}core.css" crossorigin="anonymous"></link>`)

    // @ts-ignore
    window[Symbol.for("typora-plugin-core")] = {
      app: this,
      ...Core,
    }

    I18n.setUserLocale(this.i18n.locale)

    this.vault.on('change', () => {
      this.env = this._readEnv()
      this.settings.load()
      this.plugins.unloadPlugins()
      this.start()
    })
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

  openLink(link: string) {
    if (link.startsWith('http') || link.startsWith('#')) {
      editor.tryOpenUrl(link)
    }
    else {
      this.openFile(unescape(link))
    }
  }

  async openFile(filepath: string) {
    if (filepath.startsWith('.')) {
      filepath = path.resolve(path.dirname(this.workspace.activeFile), filepath)
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

  openFileWithDefaultApp(filepath: string) {
    JSBridge.invoke("shell.openItem", filepath)
  }
}
