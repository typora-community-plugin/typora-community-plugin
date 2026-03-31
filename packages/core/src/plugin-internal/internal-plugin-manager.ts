import { useService } from "src/common/service"
import { InternalPlugin, InternalPluginManifest } from "./internal-plugin"
import { MetadataPlugin, PLUGIN_METADATA_ID } from "./plugins/plugin-metadata"


const KEY_OF_ENABLED_PLUGINS = 'internalPlugin.enabledPlugins'

export type InternalPluginSettings = {
  [KEY_OF_ENABLED_PLUGINS]: Record<string, boolean>
}

export const DEFAULT_INTERNAL_PLUGIN_SETTINGS = {
  [KEY_OF_ENABLED_PLUGINS]: {
    [PLUGIN_METADATA_ID]: false,
  }
}


export class InternalPluginManager {

  enabledPlugins: Record<string, boolean> = {}
  manifests: Record<string, InternalPluginManifest> = {}
  instances: Record<string, InternalPlugin> = {}

  constructor(private settings = useService('settings')) {
    const metadata = new MetadataPlugin()

    this.instances = {
      [PLUGIN_METADATA_ID]: metadata,
    }

    this.manifests = {
      [PLUGIN_METADATA_ID]: metadata.manifest,
    }

    this.enabledPlugins = settings.get(KEY_OF_ENABLED_PLUGINS)
      ?? DEFAULT_INTERNAL_PLUGIN_SETTINGS[KEY_OF_ENABLED_PLUGINS]
  }

  loadPlugins() {
    return Promise.all(
      Object.keys(this.manifests)
        .filter(id => this.enabledPlugins[id])
        .map(id => this.enablePlugin(id))
    )
  }

  unloadPlugins() {
    Object.keys(this.manifests)
      .filter(id => this.enabledPlugins[id])
      .map(id => this.disablePlugin(id))
  }

  enablePlugin(id: string) {
    if (this.enabledPlugins[id]) return
    this.enabledPlugins[id] = true
    this.instances[id].load()
    this.settings.set(KEY_OF_ENABLED_PLUGINS, { ...this.enabledPlugins })
  }

  disablePlugin(id: string) {
    if (!this.enabledPlugins[id]) return
    this.enabledPlugins[id] = false
    this.instances[id].unload()
    this.settings.set(KEY_OF_ENABLED_PLUGINS, { ...this.enabledPlugins })
  }
}
