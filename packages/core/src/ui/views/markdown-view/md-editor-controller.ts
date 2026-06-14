import { editor } from 'typora'
import { useService } from 'src/common/service'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { DisposeFunc } from 'src/utils/types'
import type { MarkdownView } from '.'


export class MdEditorController {

  contentEl = editor.writingArea.parentElement!
  handleSettingActiveLeaf: ((this: HTMLElement, ev: MouseEvent) => any) | null = null
  handleLayoutChanged: DisposeFunc | null = null

  private _parentTabs: WorkspaceTabs | null = null

  constructor(private workspace = useService('workspace')) { }

  active(containerEl: HTMLElement, view: MarkdownView) {
    containerEl.innerHTML = '<object type="text/html" data="about:blank"></object>'

    this.contentEl.classList.add('typ-workspace-binding')
    this.contentEl.addEventListener('mousedown', this.handleSettingActiveLeaf = () => {
      this.workspace.activeLeaf = view.leaf
    })

    this._parentTabs = view.leaf.parent as WorkspaceTabs
    setTimeout(() => {
      this.syncSize()
      this.registerObserver(containerEl)
      this.handleLayoutChanged = view.leaf.getRoot()
        .on('layout-changed', () => this.registerObserver(containerEl))
    })
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''

    this.contentEl.classList.remove('typ-workspace-binding')
    this.contentEl.removeEventListener('mousedown', this.handleSettingActiveLeaf!)
    this.unregisterObserver(containerEl)
    this.handleLayoutChanged?.()
    this.handleLayoutChanged = null
  }

  private registerObserver(el: HTMLElement) {
    const objectEl = el.children[0] as HTMLObjectElement
    if (objectEl?.contentWindow) objectEl.contentWindow.onresize = this.syncSize
  }

  private unregisterObserver(el: HTMLElement) {
    const objectEl = el.children[0] as HTMLObjectElement | undefined
    if (objectEl?.contentWindow) objectEl.contentWindow.onresize = null
  }

  public syncSize() {
    const parent = this._parentTabs
    if (!parent) return

    const { style } = document.body
    const targetEl = parent.tabContentEl
    const rect = targetEl.getBoundingClientRect()
    style.setProperty('--typ-editor-top', rect.top + 'px')
    style.setProperty('--typ-editor-left', rect.left + 'px')
    style.setProperty('--typ-editor-width', rect.width + 'px')
    style.setProperty('--typ-editor-height', rect.height + 'px')
  }
}
