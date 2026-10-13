import { useService } from "src/common/service"
import { InternalPlugin, InternalPluginManifest } from "../internal-plugin"


export const PLUGIN_METADATA_ID = 'internal.metadata'

export class MetadataPlugin extends InternalPlugin {

  declare manifest: InternalPluginManifest

  private progressEl!: HTMLElement

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
    if (!this.app?.metadata) return
    const { metadata } = this.app!
    this.progressEl = this.addStatusBarItem({ position: 'right', type: 'item' })
    let $indexedCount: JQuery | null = null

    this.register(
      metadata.on('index:start', allCount =>
        $(this.progressEl)
          .append('<span>Indexing: </span>')
          .append($indexedCount = $(`<span>0</span>`))
          .append(`<span>/${allCount}</span>`)))

    this.register(
      metadata.on('index:progress', index => $indexedCount?.text(index + 1)))

    this.register(
      metadata.on('index:done', () => this.progressEl.remove()))

    // Community plugins register their metadata providers while they load —
    // after this internal plugin's `onload`. Defer the initial index until the
    // app has finished loading so those providers are included from the start.
    this.app.once('load', () => metadata.index().catch(() => { }))
  }

  onunload() {
    this.progressEl?.remove()
    this.app.metadata.clear()
  }
}
