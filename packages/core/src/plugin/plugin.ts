import * as fs from 'fs/promises'
import * as path from 'path'
import * as _ from 'lodash'
import type { App } from "../app"
import type { PluginManifest } from "./plugin-manifest"
import type { Command } from "../command/command-manager"
import { Component } from "../component"
import { SettingsModal } from "../settings/settings-modal"
import type { SettingTab } from "../settings/setting-tab"
import type { TPostProcessor } from '../ui/editor/postprocessor'
import type { TPreProcessor } from '../ui/editor/preprocessor'
import { PluginSettings } from './plugin-settings'


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
