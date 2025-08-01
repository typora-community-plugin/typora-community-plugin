import { Closeable, View } from "../common/view"
import type { WorkspaceLeaf } from "./workspace-leaf"


export abstract class WorkspaceView extends View implements Closeable {

  constructor(public leaf: WorkspaceLeaf) {
    super()
  }

  open() {
    this.onOpen()
  }

  onOpen() { }

  close() {
    this.onClose()
  }

  onClose() { }
}
