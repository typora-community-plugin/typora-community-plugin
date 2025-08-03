import './markdown-editor-view.scss'
import { editor, CodeMirror } from "typora"
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { WorkspaceView } from '../layout/workspace-view'
import type { WorkspaceTabs } from '../layout/tabs'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { uniqueId } from 'src/utils'


enum EditorMode { Typora, CodeMirror }

// 状态模式、状态机、状态转移算法
// 同步占位 view 的位置、大小到 content
export class MarkdownEditorView extends WorkspaceView {

  static parent: WorkspaceTabs

  /**
   * Placeholder
   */
  containerEl = $('<div class="typ-editor-view"></div>')[0]

  mode: EditorMode
  codemirrorEditor?: InternalCodeMirror

  constructor(leaf: WorkspaceLeaf, public filePath?: string) {
    super(leaf)

    setTimeout(() => this.autoSetMode())
    leaf.getRoot().on('layout-changed', () => this.autoSetMode())
  }

  autoSetMode() {
    if (!MarkdownEditorView.parent || MarkdownEditorView.parent === this.leaf.parent) {
      this.setMode(EditorMode.Typora)
    }
    else {
      this.setMode(EditorMode.CodeMirror)
    }
  }

  onOpen() {
    this.autoSetMode()
    if (this.mode === EditorMode.Typora) editor.library.openFile(this.filePath)
  }

  onClose() {
    if (this.mode === EditorMode.Typora) {
      // fix: can not close codemirror editor when dragging the only one Typora editor tab from Tabs A to Tabs B (which contains CodeMirror editor)
      if (this.leaf.parent.children.length === 1) {
        MarkdownEditorView.parent = null
      }
    }
    else {
      // fix: can not close codemirror tab when dragging it from Tabs B to Tabs A (which contains Typora editor)
      this.codemirrorEditor?.deactive()
      this.codemirrorEditor = null
    }
  }

  private setMode(mode: EditorMode) {
    this.mode = mode
    if (mode === EditorMode.Typora) {
      this.switchToTyporaMode()
    } else {
      this.switchToCodeMirrorMode(this.filePath)
    }
  }

  private switchToTyporaMode() {
    this.codemirrorEditor?.deactive()
    this.codemirrorEditor = null
    InternalEditor.instance.active(this.leaf, this.containerEl)
  }

  private switchToCodeMirrorMode(filePath?: string) {
    if (MarkdownEditorView.parent === this.leaf.parent) {
      InternalEditor.instance.deactive(this.containerEl)
    }
    this.codemirrorEditor = new InternalCodeMirror()
    this.codemirrorEditor.active(filePath, this.containerEl)
  }
}

class InternalEditor {

  static instance = new InternalEditor()

  contentEl = editor.writingArea.parentElement
  handleSettingActiveLeaf: (this: HTMLElement, ev: MouseEvent) => any

  private constructor() { }

  active(leaf: WorkspaceLeaf, el: HTMLElement) {
    el.innerHTML = '<object type="text/html" data="about:blank"></object>'

    this.contentEl.classList.add('typ-workspace-binding')
    this.contentEl.addEventListener('mousedown', this.handleSettingActiveLeaf = () => {
      useService('workspace').activeLeaf = leaf
    })
    setTimeout(() => {
      MarkdownEditorView.parent = leaf.parent as WorkspaceTabs
      this.syncSize()
      this.registerObserver(el)
      leaf.getRoot().on('layout-changed', () => this.registerObserver(el))
    })
  }

  deactive(el: HTMLElement) {
    el.innerHTML = ''

    this.contentEl.classList.remove('typ-workspace-binding')
    this.contentEl.removeEventListener('mousedown', this.handleSettingActiveLeaf!)
    this.unregisterObserver(el)
  }

  private registerObserver(el: HTMLElement) {
    const objectEl = el.children[0] as HTMLObjectElement
    if (objectEl.contentWindow) objectEl.contentWindow.onresize = this.syncSize
  }

  private unregisterObserver(el: HTMLElement) {
    const objectEl = el.children[0] as HTMLObjectElement
    if (objectEl.contentWindow) objectEl.contentWindow.onresize = null
  }

  private syncSize() {
    if (!MarkdownEditorView.parent) return

    const { style } = document.body
    const targetEl = MarkdownEditorView.parent.tabContentEl
    const rect = targetEl.getBoundingClientRect()
    style.setProperty('--typ-editor-top', rect.top + 'px')
    style.setProperty('--typ-editor-left', rect.left + 'px')
    style.setProperty('--typ-editor-width', rect.width + 'px')
    style.setProperty('--typ-editor-height', rect.height + 'px')
  }
}

const OPTIONS = {
  mode: 'markdown',
  styleSelectedText: true,
  maxHighlightLength: 1 / 0,
  viewportMargin: 1 / 0,
  styleActiveLine: true,
  theme: " inner null-scroll",
  lineWrapping: true,
  lineNumbers: true,
  resetSelectionOnContextMenu: true,
  cursorScrollMargin: 60,
  dragDrop: false,
  scrollbarStyle: "null",
}

const FAKE_EDITOR = {
  sourceView: {
    inSourceMode: false,
  },
  undo: {
    register() { },
    lastRegisteredOperationCommand() { },
  }
}

class InternalCodeMirror {

  private cm: ReturnType<typeof CodeMirror>

  getText() {
    return this.cm.getValue()
  }

  setText(text: string) {
    this.cm.setValue(text)
  }

  active(filePath: string | undefined, el: HTMLElement) {
    el.innerHTML = '<textarea></textarea>'
    this.cm = CodeMirror(el, OPTIONS, FAKE_EDITOR, uniqueId('cm'))
    if (filePath) {
      this.cm.setValue(fs.readTextSync(filePath))
    }
  }

  deactive() {
    this.cm = null
  }
}
