import './index.scss'
import { WorkspaceParent } from '../workspace-parent'
import type { WorkspaceNode } from '../workspace-node'
import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import { KEY_OF_ENABLED_PLUGINS } from 'src/plugin-internal/internal-plugin-manager'
import { PLUGIN_WORKSPACE_ID } from 'src/plugin-internal/plugins/plugin-workspace'
import { openFloatingLeaf } from '../workspace-utils'


/**
 * Floating container: holds views detached from the main layout (rootSplit).
 *
 * @since v2.10.1
 */
export class WorkspaceFloating extends WorkspaceParent {

  type = 'floating'

  private registry = new Component()

  constructor(
    commands = useService('command-manager'),
    settings = useService('settings'),
  ) {
    super()

    $(this.containerEl).addClass('typ-workspace-floating').css({ display: 'none' })

    this.registry.onload = () => {
      this.registry.register(
        commands.register({
          id: 'core.workspace.floating-split:open-leaf',
          title: 'Open floating leaf',
          scope: 'global',
          showInCommandPanel: false,
          callback: openFloatingLeaf,
        }))
    }

    const USE_WORKSPACE = [KEY_OF_ENABLED_PLUGINS, PLUGIN_WORKSPACE_ID]
    const onSwitchWorkspace = (_: string | string[], isEnabled: any) => {
      isEnabled ? this.registry.load() : this.registry.unload()
    }
    settings.onChange(USE_WORKSPACE, onSwitchWorkspace)
    setTimeout(() => onSwitchWorkspace(USE_WORKSPACE, settings.get(USE_WORKSPACE)))
  }

  /**
   * Do not mount child DOM into the floating container:
   * Floating children are positioned and rendered independently (e.g., popups/overlays),
   * avoiding entry into the main layout's flex flow.
   */
  protected _insertChildEl(_index: number, _child: WorkspaceNode): void {
    // no-op: DOM is managed independently by the floating layer
  }

  protected _removeChild(child: WorkspaceNode) {
    const index = this.children.findIndex(c => c === child)
    if (index === -1) return
    this.children.splice(index, 1)
    child.setParent(null)
    // Do not call child.containerEl.remove(): DOM is managed independently by the floating layer
  }
}
