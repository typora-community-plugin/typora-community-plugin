import { Component } from "src/common/component"
import { Closeable } from "../common/view"
import type { WorkspaceLeaf } from "./workspace-leaf"


export abstract class WorkspaceView extends Component implements Closeable {

  containerEl: HTMLElement

  constructor(public leaf: WorkspaceLeaf) {
    super()
  }

  open() {
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
