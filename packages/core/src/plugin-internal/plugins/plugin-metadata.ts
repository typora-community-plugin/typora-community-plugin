import { useService } from "src/common/service"
import { InternalPlugin, InternalPluginManifest } from "../internal-plugin"


export const PLUGIN_METADATA_ID = 'internal.metadata'

export class MetadataPlugin extends InternalPlugin {

  declare manifest: InternalPluginManifest

  private progressEl: HTMLElement

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
    const { metadata } = this.app
    this.progressEl = this.addStatusBarItem({ position: 'right', type: 'item' })
    let $indexedCount: JQuery = null

    this.register(
      metadata.on('index:all-count', allCount =>
        $(this.progressEl)
          .append('<span>Indexing: </span>')
          .append($indexedCount = $(`<span>0</span>`))
          .append(`<span>/${allCount}</span>`)))

    this.register(
      metadata.on('index:one', index => $indexedCount.text(index + 1)))

    this.register(
      metadata.on('index:all-completed', () => this.progressEl.remove()))

    metadata.index()
  }

  onunload() {
    this.progressEl.remove()
    this.app.metadata.clear()
  }
}
