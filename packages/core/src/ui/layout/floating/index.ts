import './index.scss'
import { WorkspaceParent } from '../workspace-parent'
import type { WorkspaceNode } from '../workspace-node'


/**
 * Floating container: holds views detached from the main layout (rootSplit).
 */
export class WorkspaceFloating extends WorkspaceParent {

  type = 'floating'

  constructor() {
    super()

    $(this.containerEl).addClass('typ-workspace-floating').css({ display: 'none' })
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
    this.children.splice(index, 1)
    child.setParent(null)
    // Do not call child.containerEl.remove(): DOM is managed independently by the floating layer
  }
}

/**
 * Create a new floating container instance.
 *
 * @example
 * const floating = createFloating()
 * workspace.floatingSplit.appendChild(floating)
 */
export function createFloating() {
  return new WorkspaceFloating()
}
