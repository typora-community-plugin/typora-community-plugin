import './setting-tab.scss'
import type { App } from "../app"
import type { Plugin } from "../plugin/plugin"
import { View } from "../ui/view"
import { html } from "../utils/html"
import { SettingItem } from "./setting-item"


export abstract class SettingTab extends View {

  abstract get name(): string

  constructor() {
    super()
    this.containerEl = html`<div class="typ-setting-tab" style="display: none;"></div>`
  }

  onunload() {
    this.containerEl.remove()
  }

  addSettingTitle(text: string) {
    this.addSetting(setting => setting.addTitle(text))
  }

  addSetting(build: (setting: SettingItem) => void) {
    const setting = new SettingItem()
    build(setting)
    this.addChild(setting)
    this.containerEl.append(setting.containerEl)
  }
}

export abstract class PluginSettingTab extends SettingTab {

  constructor(private app: App, private plugin: Plugin) {
    super()
  }

  get name() {
    return this.plugin.manifest.name
  }
}
