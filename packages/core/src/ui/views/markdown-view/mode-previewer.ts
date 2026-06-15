import type { ModeController, ModeContext } from './mode-controller'
import { MdPreviewerController } from './md-previewer-controller'
import type { ScrollState } from 'src/ui/layout/workspace-view'


export class PreviewerMode {

  readonly controller: ModeController

  constructor() {
    this.controller = new MdPreviewerController()
  }

  enter(ctx: ModeContext) {
    const { containerEl } = ctx
    containerEl.classList.remove('mode-typora')
    containerEl.classList.add('mode-previewer')
    this.controller.activate(ctx)
  }

  exit(ctx: ModeContext) {
    this.controller.deactivate(ctx)
    ctx.containerEl.classList.remove('mode-previewer')
  }

  getScroll(): ScrollState {
    return this.controller.getScroll()
  }

  applyScroll(state: ScrollState): void {
    this.controller.applyScroll(state)
  }
}
