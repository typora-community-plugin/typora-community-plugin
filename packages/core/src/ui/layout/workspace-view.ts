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
    this.icon = icon
    $((this.leaf.parent as WorkspaceTabs).tabHeader.getTabById(this.leaf.state.path))
      .find('.typ-file-icon')
      .removeClass()
      .addClass('typ-file-icon fa ' + icon)
  }

  open() {
    setTimeout(() => this.setIcon(this.icon), 167)
    this.load()
    this.onOpen()
  }

  onOpen() { }

  close() {
    this.onClose()
    this.unload()
  }

  onClose() { }
}
