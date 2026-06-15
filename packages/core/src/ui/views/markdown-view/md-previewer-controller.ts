import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import type { ModeController, ModeContext } from './mode-controller'
import type { ScrollState } from 'src/ui/layout/workspace-view'


export class MdPreviewerController implements ModeController {

  private _containerEl: HTMLElement | null = null

  constructor(private mdRenderer = useService('markdown-renderer')) { }

  activate(ctx: ModeContext) {
    const { containerEl, filePath } = ctx
    this._containerEl = containerEl
    fs.readText(filePath).then(md =>
      this.mdRenderer.renderTo(md, containerEl))
  }

  deactivate(ctx: ModeContext) {
    ctx.containerEl.innerHTML = ''
    this._containerEl = null
  }

  getScroll(): ScrollState {
    return { scrollTop: this._containerEl?.scrollTop ?? 0 }
  }

  applyScroll(state: ScrollState): void {
    if (this._containerEl) this._containerEl.scrollTop = state.scrollTop
  }
}
