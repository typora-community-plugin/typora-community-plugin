import * as path from 'path'
import * as fs from 'fs/promises'
import type { App } from "../app"
import type { PluginManifest } from "./plugin-manifest"
import { Plugin } from "./plugin"
import { _options } from 'typora'


export class PluginManager {

  globalRootDir = path.join(_options.userDataPath, 'plugins')
  globalPluginsDir = ''
  vaultPluginsDir = ''

  enabledPlugins: Record<string, boolean> = {}
  manifests: Record<string, PluginManifest> = {}
  instances: Record<string, Plugin> = {}
  styles: Record<string, string> = {}

  constructor(private app: App) {
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
    const pluginDirs = [
      ...await this._readPluginsDir(this.globalPluginsDir),
      ...await this._readPluginsDir(this.vaultPluginsDir),
    ]

    for (const dir of pluginDirs) {
      const manifestPath = path.join(dir, 'manifest.json')

      try {
        await fs.access(manifestPath)

        const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as PluginManifest
        manifest.dir = dir

        this.manifests[manifest.id] = manifest
      } catch (error) {
        console.error(error)
      }
    }
  }

  private async _readPluginsDir(pluginsPath: string) {
    if (!pluginsPath) return []

    let result: string[] = []
    try {
      fs.access(pluginsPath)
      const dirnames = await fs.readdir(pluginsPath)
      result = dirnames.map(dir => path.join(pluginsPath, dir))
    } catch (error) {
      console.error(error)
    } finally {
      return result
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

  unloadPlugins() {
    Object.keys(this.instances)
      .map(id => this.unloadPlugin(id))
  }

  async loadPlugin(id: string) {
    const module = await import(path.join(this.manifests[id].dir!, 'main.js'))

    const PluginImplement = module.default
    this.instances[id] = new PluginImplement(this.app, this.manifests[id])

    try {
      const cssText = await fs.readFile(path.join(this.manifests[id].dir!, 'style.css'), 'utf8')
      this.styles[id] = cssText
    } catch (error) {
    }
  }

  unloadPlugin(id: string) {
    this.disablePlugin(id)
    delete this.instances[id]
    delete this.styles[id]
  }

  async enablePlugin(id: string) {
    if (!this.instances[id]) {
      await this.loadPlugin(id)
    }

    this.instances[id].load()

    if (this.styles[id]) {
      document.head.insertAdjacentHTML('beforeend', `<style id="typora-plugin:${id}">${this.styles[id]}</style>`)
    }

    this.enabledPlugins[id] = true
    this._saveEnabledConfig()
  }

  disablePlugin(id: string) {
    this.instances[id].unload()
    document.getElementById(`typora-plugin:${id}`)?.remove()

    this.enabledPlugins[id] = false
    this._saveEnabledConfig()
  }

  private _saveEnabledConfig() {
    this.app.vault.writeConfigJson('plugins', this.enabledPlugins)
  }
}
