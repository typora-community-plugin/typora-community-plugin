import type { ModeController, ModeContext } from './mode-controller'
import type { MarkdownViewMediator } from './markdown-view-mediator'
import { MdEditorController } from './md-editor-controller'
import type { ScrollState } from 'src/ui/layout/workspace-view'


export class TyporaMode {

  readonly controller: ModeController

  constructor(private mediator: MarkdownViewMediator) {
    this.controller = new MdEditorController()
  }

  enter(ctx: ModeContext) {
    const { containerEl } = ctx
    containerEl.classList.remove('mode-previewer')
    containerEl.classList.add('mode-typora')
    this.mediator.parentTabs = ctx.leaf.parent as any
    this.controller.activate(ctx)
  }

  exit(ctx: ModeContext) {
    this.controller.deactivate(ctx)
    ctx.containerEl.classList.remove('mode-typora')
  }

  getScroll(): ScrollState {
    return this.controller.getScroll()
  }

  applyScroll(state: ScrollState): void {
    this.controller.applyScroll(state)
  }
}
