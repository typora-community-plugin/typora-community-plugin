import './setting-tab.scss'
import type { App } from "src/app"
import type { Plugin } from "src/plugin/plugin"
import { View } from "src/ui/common/view"
import { html } from "src/utils"
import { SettingContainer, SettingItem } from "./setting-item"


export abstract class SettingTab extends View {

  abstract get name(): string

  constructor() {
    super()
    this.containerEl = html`<div class="typ-setting-tab"></div>`
  }

  addSettingTitle(text: string) {
    this.addSetting(setting => setting.addTitle(text))
  }

  addSetting(build: (setting: SettingItem) => void) {
    new SettingContainer(this.containerEl).addSetting(build)
  }

  /**
   * @deprecated compatible with old api (<=2.2.22)
   */
  load() {
    // @ts-ignore
    this.onload?.()
  }

  /**
   * @deprecated compatible with old api (<=2.2.22)
   */
  unload() {
    // @ts-ignore
    this.onunload?.()
  }

  show() { this.onshow() }

  onshow() { }

  hide() { this.onhide() }

  onhide() { }
}

export abstract class PluginSettingTab extends SettingTab {

  constructor(private app: App, private plugin: Plugin) {
    super()
  }

  get name() {
    return this.plugin.manifest.name
  }
}
