import { Component } from "src/common/component"
import type { PublicEvents } from "src/common/events"
import type { Closeable } from "../common/view"
import type { WorkspaceEvents } from "./workspace-root"
import type { WorkspaceTabs } from "./tabs"
import type { WorkspaceLeaf } from "./workspace-leaf"


export abstract class WorkspaceView extends Component implements Closeable {

  containerEl: HTMLElement

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
    (this.leaf.getRoot() as unknown as PublicEvents<WorkspaceEvents>).emit('leaf:open', this.leaf)
  }

  onOpen() { }

  close() {
    if (!this.isOpen) return
    this.isOpen = false
    this.onClose()
    this.unload()
  }

  onClose() { }
}
