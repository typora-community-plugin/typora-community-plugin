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


export abstract class Plugin extends Component {

  constructor(
    protected app: App,
    public manifest: PluginManifest
  ) {
    super()
  }

  get dataPath() {
    return path.join(this.app.vault.dataDir, `${this.manifest.id}.json`)
  }

  async loadData() {
    return fs.readFile(this.dataPath, 'utf8')
      .catch(error => ({}))
  }

  async saveData(data: any) {
    return fs.writeFile(this.dataPath, JSON.stringify(data, null, 2), 'utf8')
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
