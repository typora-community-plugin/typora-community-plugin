import { useService } from "src/common/service"
import { InternalPlugin, InternalPluginManifest } from "../internal-plugin"


export const PLUGIN_METADATA_ID = 'internal.metadata'

export class MetadataPlugin extends InternalPlugin {

  declare manifest: InternalPluginManifest

  constructor(i18n = useService('i18n')) {
    super(PLUGIN_METADATA_ID)

    const t = i18n.t.internalPlugins.metadata
    this.manifest = {
      id: PLUGIN_METADATA_ID,
      name: t.name,
      description: t.description,
    }
  }

  onload() {
    this.app.metadata.index()
  }

  onunload() {
    this.app.metadata.clear()
  }
}
