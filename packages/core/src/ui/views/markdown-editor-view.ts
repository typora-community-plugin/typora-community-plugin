import './markdown-editor-view.scss'
import { editor } from "typora"
import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import { WorkspaceView } from '../layout/workspace-view'
import type { WorkspaceTabs } from '../layout/tabs'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'


enum EditorMode { Typora, Previewer }

export class MarkdownEditorView extends WorkspaceView {

  static parent: WorkspaceTabs

  /**
   * Placeholder
   */
  containerEl = $('<div class="typ-editor-view"></div>')[0]

  mode: EditorMode
  mdPreviewer?: MarkdownPreviewer

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
      this.setMode(EditorMode.Previewer)
    }
  }

  onOpen() {
    this.autoSetMode()
    if (this.mode === EditorMode.Typora) {
      editor.writingArea.parentElement.classList.remove('typ-deactive')
      editor.library.openFile(this.filePath)
    }
  }

  onClose() {
    if (this.mode === EditorMode.Typora) {
      editor.writingArea.parentElement.classList.add('typ-deactive')
      // fix: can not close codemirror editor when dragging the only one Typora editor tab from Tabs A to Tabs B (which contains CodeMirror editor)
      if (MarkdownEditorView.parent.children.length === 1) {
        MarkdownEditorView.parent = null
      }
    }
    else {
      // fix: can not close codemirror tab when dragging it from Tabs B to Tabs A (which contains Typora editor)
      this.mdPreviewer?.deactive(this.containerEl)
      this.mdPreviewer = null
    }
  }

  private setMode(mode: EditorMode) {
    this.mode = mode
    if (mode === EditorMode.Typora) {
      this.switchToTyporaMode()
    } else {
      this.switchToPreviewerMode(this.filePath)
    }
  }

  private switchToTyporaMode() {
    const { containerEl } = this
    containerEl.classList.remove('mode-previewer')
    this.mdPreviewer?.deactive(containerEl)
    this.mdPreviewer = null
    setTimeout(() => (this.leaf.parent as WorkspaceTabs)?.removeTabClass(this.filePath, 'prefix-preview'))

    containerEl.classList.add('mode-typora')
    InternalEditor.instance.active(containerEl, this.leaf);
  }

  private switchToPreviewerMode(filePath?: string) {
    const { containerEl } = this
    containerEl.classList.remove('mode-typora')
    if (MarkdownEditorView.parent === this.leaf.parent) {
      InternalEditor.instance.deactive(containerEl)
    }

    containerEl.classList.add('mode-previewer')
    this.mdPreviewer = new MarkdownPreviewer()
    this.mdPreviewer.active(containerEl, filePath);
    setTimeout(() => (this.leaf.parent as WorkspaceTabs)?.addTabClass(filePath, 'prefix-preview'))
  }
}

class InternalEditor {

  static instance = new InternalEditor()

  contentEl = editor.writingArea.parentElement
  handleSettingActiveLeaf: (this: HTMLElement, ev: MouseEvent) => any

  private constructor() { }

  active(containerEl: HTMLElement, leaf: WorkspaceLeaf) {
    containerEl.innerHTML = '<object type="text/html" data="about:blank"></object>'

    this.contentEl.classList.add('typ-workspace-binding')
    this.contentEl.addEventListener('mousedown', this.handleSettingActiveLeaf = () => {
      useService('workspace').activeLeaf = leaf
    })
    setTimeout(() => {
      MarkdownEditorView.parent = leaf.parent as WorkspaceTabs
      this.syncSize()
      this.registerObserver(containerEl)
      leaf.getRoot().on('layout-changed', () => this.registerObserver(containerEl))
    })
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''

    this.contentEl.classList.remove('typ-workspace-binding')
    this.contentEl.removeEventListener('mousedown', this.handleSettingActiveLeaf!)
    this.unregisterObserver(containerEl)
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

class MarkdownPreviewer {

  active(containerEl: HTMLElement, path: string) {
    const md = fs.readTextSync(path)
    const [html] = editor.nodeMap.allNodes.first().__proto__.constructor.parseFrom(md)
    containerEl.innerHTML = html.replace(/ contenteditable='true'/g, '')
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''
  }
}
