import type { App } from 'src/app'
import { Settings, type SettingsOptions } from 'src/settings/settings'
import type { PluginManifest } from "./plugin-manifest"


type PluginSettingsOptions = Omit<SettingsOptions, 'filename'>

export class PluginSettings<T extends Record<string, any>>
  extends Settings<T> {

  constructor(
    app: App,
    manifest: PluginManifest,
    options: PluginSettingsOptions
  ) {
    super(app, {
      ...options,
      filename: `data/${manifest.id}`,
    })
  }
}
