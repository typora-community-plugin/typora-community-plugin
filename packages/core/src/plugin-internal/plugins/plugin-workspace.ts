import { useService } from 'src/common/service'
import { InternalPlugin, InternalPluginManifest } from '../internal-plugin'
import type { App } from 'src/app'
import type { Plugin } from 'src/plugin/plugin'
import type { WorkspaceSettings } from 'src/ui/settings/tabs-plugin/workspace'
import { WorkspaceSettingTab } from 'src/ui/settings/tabs-plugin/workspace'


export type { WorkspaceSettings }
export { DEFAULT_WORKSPACE_SETTINGS, WorkspaceSettingTab } from 'src/ui/settings/tabs-plugin/workspace'

export const PLUGIN_WORKSPACE_ID = 'internal.workspace'


export class WorkspacePlugin extends InternalPlugin {

  declare manifest: InternalPluginManifest

  private _settingTab!: WorkspaceSettingTab

  constructor(private i18n = useService('i18n')) {
    super(PLUGIN_WORKSPACE_ID)

    const t = this.i18n.t.internalPlugins.workspace
    this.manifest = {
      id: PLUGIN_WORKSPACE_ID,
      name: t.name,
      description: t.description,
    }
  }

  onload() {
    this._settingTab = new WorkspaceSettingTab()
    this.registerSettingTab(this._settingTab)
  }

  onunload() {
    this._settingTab.unload()
  }
}
