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
    const el = this.addStatusBarItem({ position: 'right', type: 'item' })
    const { metadata } = this.app
    let $indexedCount: JQuery = null

    metadata.on('index:all-count', allCount =>
      $(el)
        .append('<span>Indexing: </span>')
        .append($indexedCount = $(`<span>0</span>`))
        .append(`<span>/${allCount}</span>`))

    metadata.on('index:one', index => $indexedCount.text(index + 1))
    metadata.on('index:all-completed', () => el.remove())

    metadata.index()
  }

  onunload() {
    this.app.metadata.clear()
  }
}
