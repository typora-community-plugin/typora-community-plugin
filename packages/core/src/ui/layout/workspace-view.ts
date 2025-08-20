import { Component } from "src/common/component"
import { Closeable } from "../common/view"
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
    this.onOpen()
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
