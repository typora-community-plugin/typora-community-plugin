import './workspace-root.scss'
import { editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { Component } from 'src/common/component'
import type { Workspace } from "../workspace"
import type { WorkspaceNode } from './workspace-node'
import type { WorkspaceParent } from './workspace-parent'
import type { WorkspaceLeaf } from "./workspace-leaf"
import { WorkspaceSplit } from "./split"
import type { WorkspaceTabs } from './tabs'
import { draggable } from './tabs/draggable'
import { createEditorLeaf } from './workspace-utils'
import { MarkdownEditorView } from '../views/markdown-editor-view'
import { useEventBus } from 'src/common/eventbus'


export type WorkspaceEvents = {
  'layout-changed'(): void
  // 'leaf:active'(leaf: WorkspaceLeaf): void
  // 'leaf:deactive'(leaf: WorkspaceLeaf): void
  // 'leaf:toggle'(leaf: WorkspaceLeaf): void
}


export class WorkspaceRoot extends WorkspaceSplit {

  private component = new Component()

  constructor(workspace: Workspace) {
    super('vertical')

    $(document.body)
      .append($(this.containerEl)
        .addClass('typ-workspace-root')
        .on('click', e => {
          const el = e.target.closest('.typ-workspace-leaf')
          if (!el) return
          workspace.activeLeaf = this.findLeaf(this, leaf => leaf.containerEl === el)
        }))

    this.component.register(
      draggable(this)
    )

    this.component.register(
      decorate(editor.library, 'openFile', fn => (file, callback) => {
        const activeTabs = workspace.activeLeaf?.parent as WorkspaceTabs
        if (
          // handle: click file tree → open file in ActivedTabs
          MarkdownEditorView.parent === activeTabs ||
          // handle: (drag ActivedTab → close ActivedTab → open SiblingTab → open file in Non-ActivedTabs) in the Tabs with MarkdownEditorView (mode: Typora)
          MarkdownEditorView.parent.activedLeaf.state.path === file
        )
          fn(file, callback)
        else
          useEventBus('workspace').emit('file:open', file)
      }))

    this.component.register(
      workspace.on('file:open', (file) => {
        const activeTabs = workspace.activeLeaf.parent as WorkspaceTabs
        if (this.findLeaf(activeTabs, leaf => leaf.state.path === file)) {
          activeTabs.toggleTab(file)
          return
        }
        activeTabs.appendChild(createEditorLeaf(file))
      }))
  }

  eachNodes(parent: WorkspaceParent, iteratee: (node: WorkspaceNode) => boolean | void) {
    const nodes = parent.children
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (iteratee(node)) break
      if (node.type !== 'leaf') {
        this.eachNodes(node as WorkspaceParent, iteratee)
      }
    }
  }

  findNode(parent: WorkspaceParent, iteratee: (node: WorkspaceNode) => boolean) {
    let res: WorkspaceNode
    this.eachNodes(parent, node => {
      if (iteratee(node)) {
        res = node
        return true
      }
    })
    return res
  }

  eachLeaves(parent: WorkspaceParent, iteratee: (leaf: WorkspaceLeaf) => boolean | void) {
    const nodes = parent.children
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node.type === 'leaf') {
        if (iteratee(node as WorkspaceLeaf)) break
      } else {
        this.eachLeaves(node as WorkspaceParent, iteratee)
      }
    }
  }

  findLeaf(parent: WorkspaceParent, iteratee: (leaf: WorkspaceLeaf) => boolean) {
    let res: WorkspaceLeaf
    this.eachLeaves(parent, leaf => {
      if (iteratee(leaf)) {
        res = leaf
        return true
      }
    })
    return res
  }

  filterLeaves(parent: WorkspaceParent, iteratee: (leaf: WorkspaceLeaf) => boolean) {
    const res: WorkspaceLeaf[] = []
    this.eachLeaves(parent, leaf => {
      if (iteratee(leaf)) res.push(leaf)
    })
    return res
  }
}
