import type { WorkspaceLeaf } from 'src/ui/layout/workspace-leaf'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'


export class MarkdownViewMediator {

  parentTabs: WorkspaceTabs | null = null
  swappingLeaf: WorkspaceLeaf | null = null
}
