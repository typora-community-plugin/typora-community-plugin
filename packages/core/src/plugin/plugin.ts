import type { App } from "src/app"
import type { Command } from "src/command/command-manager"
import { Component } from "src/common/component"
import { useService } from "src/common/service"
import path from 'src/path'
import type { PluginManifest } from "./plugin-manifest"
import { PluginSettings } from './plugin-settings'
import { SettingsModal } from "src/ui/settings/settings-modal"
import type { SettingTab } from "src/ui/settings/setting-tab"
import type { TPostProcessor } from 'src/ui/editor/postprocessor/postprocessor-manager'
import type { TPreProcessor } from 'src/ui/editor/preprocessor/preprocessor'


interface StatusBarItemOptions {
  position: 'left' | 'right',
  hint?: string,
}

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
    public manifest: PluginManifest,
    private config = useService('config-repository'),
  ) {
    super()
  }

  get dataPath() {
    return path.join(this.config.dataDir, `${this.manifest.id}.json`)
  }

  registerSettings(settings: PluginSettings<any>) {
    this._settings = settings
    this.register(
      this.config.on('switch', () => this._settings.load()))
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

  addStatusBarItem(options?: StatusBarItemOptions) {
    options ??= { position: 'left' }
    const { hint = '' } = options

    const el = $(`<div class="footer-item footer-item-${options.position} footer-btn" ty-hint="${hint}" aria-label="${hint}">`)
      .appendTo($('footer.ty-footer'))
      .get(0)

    this.register(() => el.remove())
    return el
  }
}
