import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import type { ScrollState } from 'src/ui/layout/workspace-view'


export interface ModeContext {
  filePath: string
  leaf: WorkspaceLeaf
  containerEl: HTMLElement
}

export interface ModeController {
  enter(ctx: ModeContext): void
  exit(ctx: ModeContext): void
  getScroll(): ScrollState
  applyScroll(state: ScrollState): void
}
