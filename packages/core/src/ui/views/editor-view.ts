import './editor-view.scss'
import { editor } from "typora"
import { useService } from 'src/common/service'
import { View } from "../common/view"
import type { WorkspaceTabs } from '../layout/tabs'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'


// 状态模式、状态机、状态转移算法
// 同步占位 view 的位置、大小到 content
export class EditorView extends View {

  static instanceCount = 0
  static parent: WorkspaceTabs

  contentEl = editor.writingArea.parentElement

  /**
   * Placeholder
   */
  containerEl = $('<div class="typ-editor-view"><object type="text/html" data="about:blank"></object></div>')[0]

  constructor(tabs: WorkspaceTabs) {
    super()
    EditorView.instanceCount++
    EditorView.parent = tabs

    const contentEl = editor.writingArea.parentElement
    contentEl.classList.add('typ-workspace-binding')
    contentEl.addEventListener('mousedown', () => {
      useService('workspace').activeLeaf = EditorView.parent.children
        .find((l: WorkspaceLeaf) => l.view === this) as WorkspaceLeaf
    })
    setTimeout(() => {
      EditorView.syncSize()
      this.registerObserver()
      useService('workspace').rootSplit.on('layout-changed', () => this.registerObserver())
    })
  }

  private registerObserver() {
    const objectEl = this.containerEl.children[0] as HTMLObjectElement
    if (objectEl.contentWindow) objectEl.contentWindow.onresize = EditorView.syncSize
  }

  private static syncSize() {
    if (!EditorView.parent) return
    const targetEl = EditorView.parent.tabContentEl

    const { style } = document.body
    const rect = targetEl.getBoundingClientRect()
    style.setProperty('--typ-editor-top', rect.top + 'px')
    style.setProperty('--typ-editor-left', rect.left + 'px')
    style.setProperty('--typ-editor-width', rect.width + 'px')
    style.setProperty('--typ-editor-height', rect.height + 'px')
  }
}
