import './index.scss'
import { WorkspaceParent } from '../workspace-parent'
import type { WorkspaceNode } from '../workspace-node'
import type { WorkspaceTabs } from '../tabs'
import type { WorkspaceLeaf } from '../workspace-leaf'


/**
 * Side dock panel (left or right).
 * Similar to Obsidian's `WorkspaceSidedock`.
 *
 * Supports:
 * - Collapse / expand
 * - Drag-to-resize
 * - Empty state when no children
 *
 * @since v2.10.0
 */
export class WorkspaceSidedock extends WorkspaceParent {

  type = 'sidedock'

  size: number = 280          // default width in px
  collapsed: boolean = false  // collapse state
  side: 'right'               // which side this dock is on

  private contentEl!: HTMLElement   // .sidedock-content
  private emptyStateEl!: HTMLElement // empty state hint

  constructor(
    side: 'right',
    private onToggle?: (collapsed: boolean) => void,
  ) {
    super()

    this.side = side
    const sideClass = `mod-${side}-split`
    $(this.containerEl).addClass(`typ-workspace-sidedock ${sideClass}`)

    // The resize handle is already created by WorkspaceNode constructor.
    // For sidedock, we override its behavior: drag it to resize the dock itself.
    this.resizeHandleEl.classList.add('sidedock-resize-handle')
    // Remove the default split-child-resize handler; sidedock handles its own resize.
    $(this.resizeHandleEl).off('mousedown')
    $(this.resizeHandleEl).on('mousedown', (e: any) => {
      e.stopImmediatePropagation()
      this._onResizeStart(e.originalEvent as MouseEvent)
    })

    // Create content area — children are inserted here, not directly on the dock
    this.contentEl = $('<div class="sidedock-content">')[0]!
    this.containerEl.appendChild(this.contentEl)

    // Create empty state hint (shown when no children)
    this.emptyStateEl = $(`<div class="workspace-sidedock-empty-state">
      <p class="u-muted">This panel is empty</p>
    </div>`)[0]!
    this.containerEl.appendChild(this.emptyStateEl)

    this.collapse()
  }

  /** Collapse the side dock */
  collapse() {
    if (this.collapsed) return
    this.collapsed = true
    $(this.containerEl).addClass('is-sidedock-collapsed')
    this.setSize(0)
    this.onToggle?.(true)
  }

  /** Expand the side dock to its configured size */
  expand() {
    if (!this.collapsed) return
    this.collapsed = false
    $(this.containerEl).removeClass('is-sidedock-collapsed')
    this.setSize(this.size)
    this.onToggle?.(false)
  }

  /** Toggle collapse/expand state */
  toggle() {
    this.collapsed ? this.expand() : this.collapse()
  }

  /** Set the dock width to `n` px (minimum 280) */
  setSize(n: number) {
    const MIN_SIZE = 280
    this.size = Math.max(MIN_SIZE, n)
    document.body.style.setProperty('--typ-sidedock-width', (n === 0 ? 0 : this.size) + 'px')
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

    document.onmousemove = (e2: MouseEvent) => {
      if (!dragging) return
      const delta = startPos - e2.clientX  // drag left = wider
      let newSize = startSize + delta

      // Auto-collapse when too narrow (< 50px)
      if (newSize < 50) {
        dock.collapse()
        dragging = false
        document.onmousemove = null
        document.onmouseup = null
        return
      }

      const minSize = 180
      newSize = Math.max(minSize, newSize)
      dock.setSize(newSize)
    }

    document.onmouseup = () => {
      dragging = false
      document.onmousemove = null
      document.onmouseup = null
    }
  }
}
