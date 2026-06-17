import { editor } from 'typora'
import { useService } from 'src/common/service'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'
import type { DisposeFunc } from 'src/utils/types'
import type { ModeController, ModeContext } from './mode-controller'
import type { ScrollState } from 'src/ui/layout/workspace-view'
import { useEditingTabs } from './use-editing-tabs'
import { memorize } from 'src/utils'


export class MdEditorMode implements ModeController {

  static getInstance = memorize(() => new MdEditorMode())

  contentEl = editor.writingArea.parentElement!
  private _parentTabs: WorkspaceTabs | null = null
  private _resizeObserver: ResizeObserver | null = null
  private handleSettingActiveLeaf: ((this: HTMLElement, ev: MouseEvent) => any) | null = null

  constructor(
    private workspace = useService('workspace'),
  ) { }

  enter(ctx: ModeContext) {
    const { containerEl, leaf } = ctx
    containerEl.classList.add('mode-typora')
    containerEl.innerHTML = '<object type="text/html" data="about:blank"></object>'

    const { setEditingTabs } = useEditingTabs()
    setEditingTabs(ctx.leaf.parent as WorkspaceTabs)

    this.contentEl.classList.add('typ-workspace-binding')
    this.contentEl.addEventListener('mousedown', this.handleSettingActiveLeaf = () => {
      this.workspace.activeLeaf = leaf
    })

    this._parentTabs = leaf.parent as WorkspaceTabs

    this.syncSize()
    this.registerObserver()
  }

  exit(ctx: ModeContext) {
    ctx.containerEl.classList.remove('mode-typora')
    ctx.containerEl.innerHTML = ''

    this.contentEl.classList.remove('typ-workspace-binding')
    this.contentEl.removeEventListener('mousedown', this.handleSettingActiveLeaf!)
    this.unregisterObserver()
  }

  getScroll(): ScrollState {
    return { scrollTop: this.contentEl.scrollTop }
  }

  applyScroll(state: ScrollState): void {
    this.contentEl.scrollTop = state.scrollTop
  }

  private registerObserver() {
    this._resizeObserver = new ResizeObserver(() => this.syncSize())
    if (this._parentTabs) {
      this._resizeObserver.observe(this._parentTabs.tabContentEl)
    }
  }

  private unregisterObserver() {
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
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
