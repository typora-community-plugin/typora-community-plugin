import './variables.scss'
import * as path from 'path'
import * as Core from '.'
import { Events } from './events'
import { PluginManager } from "./plugin/plugin-manager"
import { Vault } from "./vault"
import { Workspace } from './ui/workspace'
import { HotkeyManager } from './hotkey-manager'
import { CommandManager } from './command/command-manager'
import { Settings } from './settings/settings'
import type { AppearanceSettings } from './settings/setting-tabs/appearance-setting-tab'
import type { PluginMarketplaceSettings } from './settings/setting-tabs/plugin-marketplace-setting-tab'
import { I18n } from './locales/i18n'
import { _options } from 'typora'
import * as Locale from './locales/lang.en.json'


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

type AppSettings = AppearanceSettings & PluginMarketplaceSettings

export type AppPlugin = (app: App) => void

/**
 * Proxy of Typora
 */
export class App extends Events<AppEvents> {

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

  i18n = new I18n<typeof Locale>({
    localePath: path.join(this.coreDir, 'locales')
  })

  commands = new CommandManager(this)

  env: EnvironmentVairables = this._readEnv()

  settings = new Settings<AppSettings>(this, 'core')

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

    this.vault.on('change', () => {
      this.env = this._readEnv()
      this.plugins.unloadPlugins()
      this.start()
    })
  }

  private _readEnv() {
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
}
