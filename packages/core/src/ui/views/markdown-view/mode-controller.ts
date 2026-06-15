import type { ScrollState } from 'src/ui/layout/workspace-view'
import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'


export interface ModeContext {
  filePath: string
  leaf: WorkspaceLeaf
  containerEl: HTMLElement
}

export interface ModeController {
  activate(ctx: ModeContext): void
  deactivate(ctx: ModeContext): void
  getScroll(): ScrollState
  applyScroll(state: ScrollState): void
}

export const NOOP_CONTROLLER: ModeController = {
  activate() {},
  deactivate() {},
  getScroll: () => ({ scrollTop: 0 }),
  applyScroll() {},
}
