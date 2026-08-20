import { useService } from 'src/common/service'
import { InternalPlugin, InternalPluginManifest } from '../internal-plugin'
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

    this.addSidedockButton()
  }

  onunload() {
    this._settingTab.unload()
  }

  private addSidedockButton() {
    const workspace = useService('workspace')

    // Status bar button (registered for auto-removal on unload)
    const btn = this.addStatusBarItem({ type: 'item', position: 'right', hint: 'Toggle side dock test view' })

    $(btn)
      .css({ marginLeft: '8px', padding: '0 8px' })
      .html('<i class="fa fa-align-right"></i>')
      .insertBefore('#footer-word-count')

    $(btn).on('click', () => {
      workspace.rightSplit.toggle()
    })
  }
}
