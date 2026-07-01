import { Component } from "src/common/component"
import { useEventBus } from "src/common/eventbus"
import type { Closeable } from "../common/view"
import type { WorkspaceTabs } from "./tabs"
import type { WorkspaceLeaf } from "./workspace-leaf"


export interface ScrollState {
  scrollTop: number
}

export abstract class WorkspaceView extends Component implements Closeable {

  containerEl!: HTMLElement

  icon = 'fa-file-text-o'

  constructor(public leaf: WorkspaceLeaf) {
    super()
  }

  setIcon(icon: string) {
    setTimeout(() => {
      $((this.leaf.parent as WorkspaceTabs)?.tabHeader.getTabById(this.leaf.state.path))
        .find('.typ-file-icon')
        .removeClass(this.icon)
        .addClass(icon)
      this.icon = icon
    }, 100)
  }

  private isOpen = false

  open() {
    if (this.isOpen) return
    this.isOpen = true
    this.setIcon(this.icon)
    this.load()
    this.onOpen();
    useEventBus('workspace-root').emit('leaf:open', this.leaf)
  }

  onOpen() { }

  close() {
    if (!this.isOpen) return
    this.isOpen = false
    useEventBus('workspace-root').emit('leaf:will-close', this.leaf)
    this.onClose()
    useEventBus('workspace-root').emit('leaf:close', this.leaf)
    this.unload()
  }

  onClose() { }

  getScroll(): ScrollState {
    return { scrollTop: this.leaf.containerEl.scrollTop }
  }

  applyScroll(state: ScrollState): void {
    this.leaf.containerEl.scrollTop = state.scrollTop
  }
}
