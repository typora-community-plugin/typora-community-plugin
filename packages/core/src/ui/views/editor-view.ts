import { editor } from "typora"
import { View } from "../common/view"


// 同步占位 view 的位置、大小到 content
export class EditorView extends View {

  contentEl = editor.writingArea.parentElement

  /**
   * Placeholder
   */
  containerEl = $('<div class="typ-editor-view">')[0]

  constructor() {
    super()
    setTimeout(() => this.syncSize())
    window.addEventListener('resize', () => this.syncSize())
  }

  private syncSize() {
    document.body.style.setProperty('--typ-editor-width', this.containerEl.offsetWidth + 'px')
    document.body.style.setProperty('--typ-editor-height', this.containerEl.offsetHeight + 'px')
  }
}
