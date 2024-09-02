import './setting-tab.scss'
import type { App } from "src/app"
import type { Plugin } from "src/plugin/plugin"
import { View } from "src/ui/common/view"
import { html } from "src/utils"
import { SettingItem } from "./setting-item"


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
    const setting = new SettingItem()
    build(setting)
    this.containerEl.append(setting.containerEl)
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

  /**
   * @deprecated compatible with old api (<=2.2.22)
   */
  show() { }

  /**
   * @deprecated compatible with old api (<=2.2.22)
   */
  hide() { }
}

export abstract class PluginSettingTab extends SettingTab {

  constructor(private app: App, private plugin: Plugin) {
    super()
  }

  get name() {
    return this.plugin.manifest.name
  }
}
