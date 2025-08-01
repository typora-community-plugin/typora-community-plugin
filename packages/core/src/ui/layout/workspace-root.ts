import './workspace-root.scss'
import type { Workspace } from "../workspace"
import type { WorkspaceParent } from './workspace-parent'
import { WorkspaceLeaf } from "./workspace-leaf"
import { WorkspaceSplit } from "./split"
import type { WorkspaceTabs } from './tabs'
import { createEditorLeaf } from './workspace-utils'


export type WorkspaceEvents = {
  'layout-changed'(): void
  // 'leaf:active'(leaf: WorkspaceLeaf): void
  // 'leaf:deactive'(leaf: WorkspaceLeaf): void
  // 'leaf:toggle'(leaf: WorkspaceLeaf): void
}


export class WorkspaceRoot extends WorkspaceSplit {

  constructor(workspace: Workspace) {
    super('vertical')

    $(document.body)
      .append($(this.containerEl)
        .addClass('typ-workspace-root')
        .on('click', e => {
          const el = e.target.closest('.typ-workspace-leaf')
          if (!el) return
          workspace.activeLeaf = this.findLeaves(this, leaf => leaf.containerEl === el).pop()
        }))

    workspace.on('file:open', (file) => {
      const activeTabs = workspace.activeLeaf.parent as WorkspaceTabs
      if (this.findLeaves(activeTabs, leaf => leaf.state.path === file).length) {
        activeTabs.toggleTab(file)
        return
      }
      activeTabs.appendChild(createEditorLeaf(file))
    })
  }

  eachLeaves(parent: WorkspaceParent, iteratee: (leaf: WorkspaceLeaf) => boolean | void) {
    const nodes = parent.children
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node.type !== 'leaf') {
        this.eachLeaves(node as WorkspaceParent, iteratee)
        continue
      }
      if (iteratee(node as WorkspaceLeaf)) break
    }
  }

  findLeaves(parent: WorkspaceParent, iteratee: (leaf: WorkspaceLeaf) => boolean) {
    const res: WorkspaceLeaf[] = []
    this.eachLeaves(parent, v => {
      if (iteratee(v)) res.push(v)
    })
    return res
  }
}
