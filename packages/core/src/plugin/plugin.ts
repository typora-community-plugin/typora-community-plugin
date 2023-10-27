import type { App } from "src/app"
import type { Command } from "src/command/command-manager"
import { Component } from "src/component"
import path from 'src/path'
import type { PluginManifest } from "./plugin-manifest"
import { PluginSettings } from './plugin-settings'
import { SettingsModal } from "src/settings/settings-modal"
import type { SettingTab } from "src/settings/setting-tab"
import type { TPostProcessor } from 'src/ui/editor/postprocessor/postprocessor-manager'
import type { TPreProcessor } from 'src/ui/editor/preprocessor'


export abstract class Plugin<T extends Record<string, any> = {}>
  extends Component {

  private _settings: PluginSettings<T>

  get settings() {
    if (!this._settings) {
      throw Error('[Plugin] Use `registerSettings()` register `PluginSettings` instance before using `settings`.')
    }
    return this._settings
  }

  constructor(
    protected app: App,
    public manifest: PluginManifest
  ) {
    super()
  }

  get dataPath() {
    return path.join(this.app.vault.dataDir, `${this.manifest.id}.json`)
  }

  registerSettings(settings: PluginSettings<any>) {
    this._settings = settings
    this.register(
      this.app.vault.on('change', () => this._settings.load()))
  }

  registerSettingTab(tab: SettingTab) {
    this.register(
      this.app.workspace.getViewByType(SettingsModal)!
        .addTab(tab))
  }

  registerCommand(command: Command) {
    command.id = this.manifest.id + ':' + command.id
    command.title = this.manifest.name + ': ' + command.title
    this.register(
      this.app.commands.register(command))
  }

  registerMarkdownPreProcessor(processor: TPreProcessor) {
    this.register(
      this.app.workspace.activeEditor.preProcessor.register(processor))
  }

  registerMarkdownPostProcessor(processor: TPostProcessor) {
    this.register(
      this.app.workspace.activeEditor.postProcessor.register(processor))
  }
}
