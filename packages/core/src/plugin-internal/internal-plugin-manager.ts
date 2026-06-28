import { useService } from "src/common/service"
import { InternalPlugin, InternalPluginManifest } from "./internal-plugin"
import { MetadataPlugin, PLUGIN_METADATA_ID } from "./plugins/plugin-metadata"
import { WorkspacePlugin, PLUGIN_WORKSPACE_ID } from "./plugins/plugin-workspace"


const KEY_OF_ENABLED_PLUGINS = 'internalPlugin.enabledPlugins'

export type InternalPluginSettings = {
  [KEY_OF_ENABLED_PLUGINS]: Record<string, boolean>
}

export const DEFAULT_INTERNAL_PLUGIN_SETTINGS = {
  [KEY_OF_ENABLED_PLUGINS]: {
    [PLUGIN_METADATA_ID]: false,
    [PLUGIN_WORKSPACE_ID]: true,
  }
}


export class InternalPluginManager {

  enabledPlugins: Record<string, boolean> = {}
  manifests: Record<string, InternalPluginManifest> = {}
  instances: Record<string, InternalPlugin> = {}

  constructor(
    private settings = useService('settings'),
    private logger = useService('logger', ['InternalPluginManager']),
  ) {
    const metadata = new MetadataPlugin()
    const workspace = new WorkspacePlugin()

    this.instances = {
      [PLUGIN_METADATA_ID]: metadata,
      [PLUGIN_WORKSPACE_ID]: workspace,
    }

    this.manifests = {
      [PLUGIN_METADATA_ID]: metadata.manifest,
      [PLUGIN_WORKSPACE_ID]: workspace.manifest,
    }
  }

  loadPlugins() {
    this.enabledPlugins = this.settings.get(KEY_OF_ENABLED_PLUGINS)

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
    try {
      this.enabledPlugins[id] = true
      this.instances[id].load()
      this.settings.set(KEY_OF_ENABLED_PLUGINS, { ...this.enabledPlugins })
    } catch (error) {
      this.logger.error(error)
    }
  }

  disablePlugin(id: string) {
    try {
      this.enabledPlugins[id] = false
      this.instances[id].unload()
      this.settings.set(KEY_OF_ENABLED_PLUGINS, { ...this.enabledPlugins })
    } catch (error) {
      this.logger.error(error)
    }
  }
}
