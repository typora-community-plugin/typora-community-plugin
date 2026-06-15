import { editor } from 'typora'
import { useService } from 'src/common/service'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { DisposeFunc } from 'src/utils/types'
import type { ModeController, ModeContext } from './mode-controller'
import type { ScrollState } from 'src/ui/layout/workspace-view'


export class MdEditorController implements ModeController {

  contentEl = editor.writingArea.parentElement!
  handleSettingActiveLeaf: ((this: HTMLElement, ev: MouseEvent) => any) | null = null
  handleLayoutChanged: DisposeFunc | null = null

  private _parentTabs: WorkspaceTabs | null = null

  constructor(private workspace = useService('workspace')) { }

  activate(ctx: ModeContext) {
    const { containerEl, leaf } = ctx
    containerEl.innerHTML = '<object type="text/html" data="about:blank"></object>'

    this.contentEl.classList.add('typ-workspace-binding')
    this.contentEl.addEventListener('mousedown', this.handleSettingActiveLeaf = () => {
      this.workspace.activeLeaf = leaf
    })

    this._parentTabs = leaf.parent as WorkspaceTabs
    setTimeout(() => {
      this.syncSize()
      this.registerObserver(containerEl)
      this.handleLayoutChanged = leaf.getRoot()
        .on('layout-changed', () => this.registerObserver(containerEl))
    })
  }

  deactivate(ctx: ModeContext) {
    const { containerEl } = ctx
    containerEl.innerHTML = ''

    this.contentEl.classList.remove('typ-workspace-binding')
    this.contentEl.removeEventListener('mousedown', this.handleSettingActiveLeaf!)
    this.unregisterObserver(containerEl)
    this.handleLayoutChanged?.()
    this.handleLayoutChanged = null
  }

  getScroll(): ScrollState {
    return { scrollTop: this.contentEl.scrollTop }
  }

  applyScroll(state: ScrollState): void {
    this.contentEl.scrollTop = state.scrollTop
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
