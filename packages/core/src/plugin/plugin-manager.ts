import * as path from 'path'
import * as _ from 'lodash'
import { _options } from 'typora'
import type { App } from "src/app"
import { Notice } from 'src/components/notice'
import fs from 'src/fs/filesystem'
import { Plugin } from "./plugin"
import type { PluginManifest, PluginPostion } from "./plugin-manifest"
import { PluginMarketplace } from './plugin-marketplace'
import { format } from 'src/utils/format'
import * as versions from 'src/utils/versions'


export class PluginManager {

  globalRootDir = path.join(_options.userDataPath, 'plugins')
  globalPluginsDir = ''
  vaultPluginsDir = ''

  enabledPlugins: Record<string, boolean> = {}
  manifests: Record<string, PluginManifest> = {}
  instances: Record<string, Plugin> = {}
  styles: Record<string, string> = {}

  marketplace: PluginMarketplace

  constructor(private app: App) {
    this.marketplace = new PluginMarketplace(app)
  }

  get pluginsDataDir() {
    return path.join(this.app.vault.configDir, 'data')
  }

  async loadFromVault() {
    const { PLUGIN_GLOBAL_DIR } = this.app.env

    this.globalPluginsDir = PLUGIN_GLOBAL_DIR
      ? PLUGIN_GLOBAL_DIR.replace(/\{VAULT\}/g, this.app.vault.path)
      : path.join(this.globalRootDir, 'plugins')

    this.vaultPluginsDir = path.join(this.app.vault.configDir, 'plugins')

    this.enabledPlugins = this.app.vault.readConfigJson('plugins')

    await this.loadManifests()
    await this.loadPlugins()
  }

  async loadManifests() {
    await this._loadManifests('global', this.globalPluginsDir)
    await this._loadManifests('vault', this.vaultPluginsDir)
  }

  private async _loadManifests(postion: PluginPostion, pluginsPath: string) {
    const pluginDirs = await this._readPluginsDir(pluginsPath)

    for (const dir of pluginDirs) {
      await this.loadManifest(postion, dir)
    }
  }

  private async _readPluginsDir(pluginsPath: string) {
    if (!pluginsPath) return []

    return fs.exists(pluginsPath)
      .then(() => fs.list(pluginsPath))
      .then((dirnames) =>
        dirnames.map(dir => path.join(pluginsPath, dir))
      )
      .catch(() => [])
  }

  loadManifest(postion: PluginPostion, pluginPath: string) {
    const manifestPath = path.join(pluginPath, 'manifest.json')

    return fs.exists(manifestPath)
      .then(() => fs.read(manifestPath))
      .then(text => {
        const manifest = JSON.parse(text) as PluginManifest
        manifest.postion = postion
        manifest.dir = pluginPath

        this.manifests[manifest.id] = manifest
      })
      .catch((error) => console.error(error))
  }

  /**
   * Load and enable all non-disabled plugins.
   */
  loadPlugins() {
    return Promise.all(
      Object.keys(this.manifests)
        .filter(id => this.enabledPlugins[id])
        .map(id => this.enablePlugin(id))
    )
  }

  unloadPlugins() {
    Object.keys(this.instances)
      .map(id => this.unloadPlugin(id))
  }

  async loadPlugin(id: string) {
    try {
      const manifest = this.manifests[id]

      const module = await import('file://' + path.join(manifest.dir!, 'main.js') + `?v=${manifest.version}`)

      const PluginImplement = module.default
      this.instances[id] = new PluginImplement(this.app, manifest)

      const cssPath = path.join(manifest.dir!, 'style.css')
      await fs.exists(cssPath)
        .then(() => fs.read(cssPath))
        .then(cssText => { this.styles[id] = cssText })
        .catch(() => { })
    } catch (error) {
      console.error(error)
    }
  }

  unloadPlugin(id: string) {
    this.disablePlugin(id)
    delete this.instances[id]
    delete this.styles[id]
  }

  async enablePlugin(id: string) {
    if (versions.compare(this.app.coreVersion, this.manifests[id].minCoreVersion) < 0) {
      this.disablePlugin(id)

      const msg = format(this.app.i18n.t.pluginManager.needNewerCoreVersion, this.manifests[id])
      new Notice(msg)
      return
    }

    if (!this.instances[id]) {
      await this.loadPlugin(id)
    }

    try {
      this.instances[id].load()
    } catch (error) {
      console.error(error)
    }

    if (this.styles[id]) {
      document.head.insertAdjacentHTML('beforeend', `<style id="typora-plugin:${id}">${this.styles[id]}</style>`)
    }

    this.enabledPlugins[id] = true
    this._saveEnabledConfig()
  }

  disablePlugin(id: string) {
    this.instances[id]?.unload()
    document.getElementById(`typora-plugin:${id}`)?.remove()

    this.enabledPlugins[id] = false
    this._saveEnabledConfig()
  }

  async updatePlugin(id: string) {
    const { marketplace } = this
    const t = this.app.i18n.t.pluginManager
    const manifest = this.manifests[id]

    const info = marketplace.getPlugin(id)
    const version = await marketplace.getPluginNewestVersion(info)

    if (versions.compare(manifest.version, version) >= 0) {
      new Notice(format(t.upToDate, manifest))
      return
    }

    const isEnabled = this.enabledPlugins[id]

    await this.uninstallPlugin(id)

    return marketplace.installPlugin(info, manifest.postion)
      .then(() => isEnabled && this.enablePlugin(id))
      .then(() => new Notice(format(t.updateSuccessful, manifest)))
  }

  uninstallPlugin(id: string) {
    this.unloadPlugin(id)
    const manifest = this.manifests[id]
    delete this.manifests[id]
    delete this.enabledPlugins[id]
    this._saveEnabledConfig()
    return fs.remove(manifest.dir!)
  }

  private _saveEnabledConfig = _.debounce(() => {
    this.app.vault.writeConfigJson('plugins', this.enabledPlugins)
  }, 1e3)
}
