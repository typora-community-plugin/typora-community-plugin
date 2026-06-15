import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'
import type { ModeController, ModeContext } from './mode-controller'
import type { ScrollState } from 'src/ui/layout/workspace-view'


export class MdPreviewerMode implements ModeController {

  private _containerEl: HTMLElement | null = null

  constructor(private mdRenderer = useService('markdown-renderer')) { }

  enter(ctx: ModeContext) {
    const { containerEl, filePath } = ctx
    containerEl.classList.add('mode-previewer')
    this._containerEl = containerEl
    fs.readText(filePath).then(md =>
      this.mdRenderer.renderTo(md, containerEl))
  }

  exit(ctx: ModeContext) {
    ctx.containerEl.classList.remove('mode-previewer')
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