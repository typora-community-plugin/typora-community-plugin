import { coreVersion, globalRootDir } from 'src/common/constants'
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { isCommandCancelled } from 'src/io/shell'
import path from 'src/path'
import { Notice } from 'src/ui/components/notice'
import { debounced, format } from 'src/utils'
import * as versions from 'src/utils/versions'
import type { Plugin } from "./plugin"
import type { PluginManifest, PluginPosition } from "./plugin-manifest"
import type { PluginMarketplace } from './plugin-marketplace'


export class PluginManager {

  globalRootDir = globalRootDir()
  globalPluginsDir = ''
  vaultPluginsDir = ''

  enabledPlugins: Record<string, boolean> = {}
  manifests: Record<string, PluginManifest> = {}
  instances: Record<string, Plugin> = {}
  styles: Record<string, string> = {}

  private _marketplace?: PluginMarketplace
  private _lastEnabledText = ''

  /**
   * Lazily resolve the shared `plugin-marketplace` service.
   *
   * Resolving synchronously (instead of in a `setTimeout`) keeps `marketplace`
   * available as soon as the manager is constructed, so consumers such as
   * `PluginManagerSettingTab` can subscribe during `SettingsModal.onload`
   * without racing the manager's initialization.
   */
  get marketplace(): PluginMarketplace {
    if (!this._marketplace) {
      this._marketplace = useService('plugin-marketplace')
    }
    return this._marketplace
  }

  set marketplace(marketplace: PluginMarketplace) {
    this._marketplace = marketplace
  }

  constructor(
    private logger = useService('logger', ['PluginManager']),
    private config = useService('config-repository'),
    private vault = useService('vault'),
    private i18n = useService('i18n'),
    private env = useService('env'),
  ) { }

  get pluginsDataDir() {
    return path.join(this.config.configDir, 'data')
  }

  async loadFromVault() {
    const { PLUGIN_GLOBAL_DIR } = this.env

    this.globalPluginsDir = PLUGIN_GLOBAL_DIR
      ? PLUGIN_GLOBAL_DIR.replace(/\{VAULT\}/g, this.vault.path)
      : path.join(globalRootDir(), 'plugins')

    this.vaultPluginsDir = path.join(this.config.configDir, 'plugins')

    this.enabledPlugins = this.config.readConfigJson('plugins') ?? {}
    this._lastEnabledText = JSON.stringify(this._getEnabledConfig(), null, 2)

    await this.loadManifests()
    await this.loadPlugins()
  }

  async loadManifests() {
    await this._loadManifests('global', this.globalPluginsDir)
    await this._loadManifests('vault', this.vaultPluginsDir)
  }

  private async _loadManifests(position: PluginPosition, pluginsPath: string) {
    const pluginDirs = await this._readPluginsDir(pluginsPath)

    for (const dir of pluginDirs) {
      await this.loadManifest(position, dir)
    }
  }

  private async _readPluginsDir(pluginsPath: string) {
    if (!pluginsPath) return []

    try {
      // `path.isDirectory` does not run a shell command on macOS, so checking
      // first avoids an approval dialog for a directory that does not exist.
      const exists = await fs.isDirectory(pluginsPath).catch(() => false)
      if (!exists) return []

      const dirnames = await fs.listDirs(pluginsPath)
      return dirnames.map(dir => path.join(pluginsPath, dir))
    }
    catch (error) {
      if (isCommandCancelled(error)) {
        this.logger.warn(`Listing plugin directory was cancelled: ${pluginsPath}`)
      }
      return []
    }
  }

  async loadManifest(position: PluginPosition, pluginPath: string) {
    const manifestPath = path.join(pluginPath, 'manifest.json')

    try {
      const text = fs.readTextSync(manifestPath)
      if (!text) {
        throw new Error(`Empty plugin manifest: ${manifestPath}`)
      }

      const manifest = JSON.parse(text) as PluginManifest
      if (!manifest?.id) {
        throw new Error(`Invalid plugin manifest: ${manifestPath}`)
      }

      manifest.position = position
      manifest.dir = pluginPath

      this.manifests[manifest.id] = manifest
    }
    catch (error) {
      this.logger.error(error)
    }
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

  /**
   * Unload all enabled plugins without persisting a disabled state.
   *
   * `unloadPlugin()` is for actually disabling a plugin. Using it here would
   * remove every id from `enabledPlugins` and write an empty `plugins.json`
   * during a config switch, before the new config is loaded.
   */
  unloadPlugins() {
    for (const id of Object.keys(this.enabledPlugins)) {
      try {
        this.instances[id]?.unload()
        document.getElementById(`typora-plugin:${id}`)?.remove()
      }
      catch (error) {
        this.logger.error(`Plugin.unload:${id}`, error)
      }

      delete this.instances[id]
      delete this.styles[id]
    }
  }

  async loadPlugin(id: string) {
    try {
      const manifest = this.manifests[id]

      const module = await import(`file://${path.join(manifest.dir!, 'main.js')}?v=${manifest.version}`)

      const PluginImplement = module.default
      this.instances[id] = new PluginImplement(useService('app'), manifest)

      const cssPath = path.join(manifest.dir!, 'style.css')
      try {
        const cssText = fs.readTextSync(cssPath)
        if (cssText) this.styles[id] = cssText
      }
      catch { }
    }
    catch (error) {
      this.logger.error(`Plugin.load:${id}`, error)
    }
  }

  unloadPlugin(id: string) {
    this.disablePlugin(id)
    delete this.instances[id]
    delete this.styles[id]
  }

  async enablePlugin(id: string) {
    if (versions.compare(coreVersion(), this.manifests[id].minCoreVersion) < 0) {
      this.disablePlugin(id)

      const msg = format(this.i18n.t.pluginManager.needNewerCoreVersion, this.manifests[id])
      Notice.info(msg)
      return
    }

    if (!this.instances[id]) {
      await this.loadPlugin(id)
    }

    try {
      this.instances[id].load()
    } catch (error) {
      this.logger.error(error)
    }

    if (this.styles[id]) {
      document.head.insertAdjacentHTML('beforeend', `<style id="typora-plugin:${id}">${this.styles[id]}</style>`)
    }

    this.enabledPlugins[id] = true
    this._saveEnabledConfig()
  }

  disablePlugin(id: string) {
    try {
      this.instances[id]?.unload()
      document.getElementById(`typora-plugin:${id}`)?.remove()
    } catch (error) {
      this.logger.error(`Plugin.unload:${id}`, error)
    }

    delete this.enabledPlugins[id]
    this._saveEnabledConfig()
  }

  async updatePlugin(id: string) {
    const { marketplace } = this
    const t = this.i18n.t.pluginManager
    const manifest = this.manifests[id]
    const info = marketplace.getPlugin(id)
    if (!manifest || !info) return

    const version = await marketplace.getPluginNewestVersion(info)

    if (versions.compare(manifest.version, version) >= 0) {
      Notice.info(format(t.upToDate, manifest))
      return
    }

    const isEnabled = this.enabledPlugins[id]

    await this.uninstallPlugin(id)

    return marketplace.installPlugin(info, manifest.position!)
      .then(() => isEnabled ? this.enablePlugin(id) : undefined)
      .then(() => { Notice.success(format(t.updateSuccessful, manifest)) })
  }

  uninstallPlugin(id: string) {
    this.unloadPlugin(id)
    const manifest = this.manifests[id]
    delete this.manifests[id]
    delete this.enabledPlugins[id]
    this._saveEnabledConfig()
    return fs.remove(manifest.dir!)
  }

  private _getEnabledConfig() {
    const enabledPlugins: Record<string, boolean> = {}
    for (const id of Object.keys(this.enabledPlugins).sort()) {
      enabledPlugins[id] = this.enabledPlugins[id]
    }
    return enabledPlugins
  }

  @debounced(1e3)
  private _saveEnabledConfig() {
    const enabledPlugins = this._getEnabledConfig()
    const text = JSON.stringify(enabledPlugins, null, 2)
    if (text === this._lastEnabledText) return

    const result = this.config.writeConfigJson('plugins', enabledPlugins)
    if (result && typeof result.then === 'function') {
      result.then((saved: boolean) => {
        if (saved !== false) this._lastEnabledText = text
      }, () => { })
    }
    else {
      this._lastEnabledText = text
    }
  }
}
