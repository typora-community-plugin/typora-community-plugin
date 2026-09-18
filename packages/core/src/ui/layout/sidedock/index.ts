import './index.scss'
import { WorkspaceParent } from '../workspace-parent'
import type { WorkspaceNode } from '../workspace-node'
import { useService } from 'src/common/service'
import { Component } from 'src/common/component'
import { KEY_OF_ENABLED_PLUGINS } from 'src/plugin-internal/internal-plugin-manager'
import { PLUGIN_WORKSPACE_ID } from 'src/plugin-internal/plugins/plugin-workspace'
import { ensureRightSidedockLeaf } from '../workspace-utils'


/**
 * Side dock panel (left or right).
 * Similar to Obsidian's `WorkspaceSidedock`.
 *
 * Supports:
 * - Collapse / expand
 * - Drag-to-resize
 * - Empty state when no children
 *
 * @since v2.10.1
 */
export class WorkspaceSidedock extends WorkspaceParent {

  type = 'sidedock'

  private static readonly MIN_SIZE = 280

  size: number = WorkspaceSidedock.MIN_SIZE    // default width in px
  collapsed: boolean = false  // collapse state
  side: 'right'               // which side this dock is on

  private contentEl!: HTMLElement   // .sidedock-content
  private emptyStateEl!: HTMLElement // empty state hint

  private registry = new Component()

  constructor(
    side: 'right',
    commands = useService('command-manager'),
    private settings = useService('settings'),
    i18n = useService('i18n'),
  ) {
    super()

    this.side = side
    this.size = Math.max(WorkspaceSidedock.MIN_SIZE, this.settings.get('rightSplitWidth'))

    const sideClass = `mod-${side}-split`
    $(this.containerEl).addClass(`typ-workspace-sidedock ${sideClass}`)

    // The resize handle is already created by WorkspaceNode constructor.
    // For sidedock, we override its behavior: drag it to resize the dock itself.
    this.resizeHandleEl.classList.add('sidedock-resize-handle')
    // Remove the default split-child-resize handler; sidedock handles its own resize.
    $(this.resizeHandleEl)
      .off('mousedown')
      .on('mousedown', (e: any) => {
        e.stopImmediatePropagation()
        this._onResizeStart(e.originalEvent as MouseEvent)
      })

    // Create content area — children are inserted here, not directly on the dock
    this.contentEl = $('<div class="sidedock-content">')[0]!
    this.containerEl.appendChild(this.contentEl)

    // Create empty state hint (shown when no children)
    this.emptyStateEl = $(`<div class="workspace-sidedock-empty-state">
      <p class="u-muted">${i18n.t.workspace.rightSplit.empty}</p>
    </div>`)[0]!
    this.containerEl.appendChild(this.emptyStateEl)

    this.collapse()

    this.registry.onload = () => {
      this.registry.register(
        commands.register({
          id: 'core.workspace.right-split:ensure-leaf',
          title: 'Ensure leaf',
          scope: 'global',
          showInCommandPanel: false,
          callback: ensureRightSidedockLeaf,
        }))
    }

    const USE_WORKSPACE = [KEY_OF_ENABLED_PLUGINS, PLUGIN_WORKSPACE_ID]
    const onSwitchWorkspace = (_: string | string[], isEnabled: any) => {
      isEnabled ? this.registry.load() : this.registry.unload()
    }
    settings.onChange(USE_WORKSPACE, onSwitchWorkspace)
    setTimeout(() => onSwitchWorkspace(USE_WORKSPACE, settings.get(USE_WORKSPACE)))
  }

  /** Collapse the side dock */
  collapse() {
    if (this.collapsed) return
    this.collapsed = true
    $(this.containerEl).addClass('is-sidedock-collapsed')
    this.setSize(0)
  }

  /** Expand the side dock to its configured size */
  expand() {
    if (!this.collapsed) return
    this.collapsed = false
    $(this.containerEl).removeClass('is-sidedock-collapsed')
    this.setSize(this.size)
  }

  /** Toggle collapse/expand state */
  toggle() {
    this.collapsed ? this.expand() : this.collapse()
  }

  /** Set the dock width to `n` px (minimum 180) */
  setSize(n: number) {
    if (n > 0) {
      this.size = Math.max(WorkspaceSidedock.MIN_SIZE, n)
      this.settings.set('rightSplitWidth', this.size)
    }
    // When collapsed (n === 0), this.size retains the last expanded width so expand() restores it.
    document.body.style.setProperty('--typ-sidedock-width', (n > 0 ? this.size : 0) + 'px')
  }

  /** Override: insert child DOM into the content area */
  protected _insertChildEl(index: number, child: WorkspaceNode): void {
    // Insert before empty state element
    if (this.emptyStateEl.parentNode === this.contentEl) {
      this.contentEl.insertBefore(child.containerEl, this.emptyStateEl)
    } else {
      this.contentEl.appendChild(child.containerEl)
    }

    // Hide empty state when there are children
    if (this.children.length > 0) {
      this.emptyStateEl.style.display = 'none'
    }
  }

  protected _removeChild(child: WorkspaceNode): void {
    const index = this.children.findIndex(c => c === child)
    this.children.splice(index, 1)
    child.setParent(null)
    child.containerEl.remove()

    // Show empty state when no children remain
    if (this.children.length === 0) {
      this.emptyStateEl.style.display = ''
      // Auto-collapse when last child is removed
      if (!this.collapsed) {
        this.collapse()
      }
    }
  }

  /** Mouse drag to resize the dock */
  private _onResizeStart(e: MouseEvent) {
    if (e.button !== 0) return
    e.preventDefault()

    const dock = this
    let dragging = true
    const startPos = e.clientX
    const startSize = dock.size

    function onMouseMove(e2: MouseEvent) {
      if (!dragging) return
      const delta = startPos - e2.clientX  // drag left = wider
      let newSize = startSize + delta

      // Auto-collapse when too narrow (< 50px)
      if (newSize < 50) {
        dock.collapse()
        dragging = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        return
      }

      newSize = Math.max(WorkspaceSidedock.MIN_SIZE, newSize)
      dock.setSize(newSize)
    }

    function onMouseUp() {
      dragging = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
}
