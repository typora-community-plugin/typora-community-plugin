import { useService } from 'src/common/service'
import { useEventBus } from 'src/common/eventbus'
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

    this.addSidedockButton()
  }

  onunload() {
    this._settingTab.unload()
  }

  /**
   * Add a status-bar button that opens/closes the side dock test view.
   *
   * The button is only shown while `workspace.rightSplit` has children
   * (i.e. something lives in the right dock). Clicking it toggles the
   * dock content: open creates a leaf under a new `WorkspaceTabs`,
   * close detaches all leaves from `rightSplit`.
   */
  private addSidedockButton() {
    const workspace = useService('workspace')

    // Status bar button (registered for auto-removal on unload)
    const btn = this.addStatusBarItem({ type: 'item', position: 'right', hint: 'Toggle side dock test view' })

    $(btn)
      .css({ marginLeft: '8px', padding: '0 8px' })
      .html('<i class="fa fa-align-right"></i>')
      .insertBefore('#footer-word-count')

    // Show the button only when rightSplit has children
    const updateVisibility = () => {
      $(btn).toggle(workspace.rightSplit.children.length > 0)
    }

    function openSidedockView() {
      // Ensure the dock is expanded
      workspace.rightSplit.expand()

      const leaf = workspace.createLeaf({
        type: 'core.test-sidedock',
        state: { path: 'typ://core.test-sidedock/test' },
      })

      const tabs = useService('workspace-tabs')
      tabs.appendChild(leaf)
      workspace.rightSplit.appendChild(tabs)
    }

    function closeSidedockView() {
      // Detach all leaves in the right split (empty tabs cascade-removes)
      workspace.rightSplit.eachLeaves(leaf => leaf.detach())
    }

    $(btn).on('click', () => {
      workspace.rightSplit.children.length ? closeSidedockView() : openSidedockView()
    })

    // Update visibility whenever the layout tree changes (children added/removed)
    this.register(
      useEventBus('workspace-root').on('layout-changed', updateVisibility)
    )

    // Initial sync once the workspace is loaded
    this.register(
      useEventBus('app').once('load', updateVisibility)
    )
  }
}
