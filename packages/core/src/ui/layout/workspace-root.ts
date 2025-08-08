import './workspace-root.scss'
import { editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { Component } from 'src/common/component'
import type { Workspace } from "../workspace"
import { WorkspaceSplit } from "./split"
import type { WorkspaceTabs } from './tabs'
import { draggableTabs } from './tabs/draggable'
import { createEditorLeaf } from './workspace-utils'
import { MarkdownEditorView } from '../views/markdown-editor-view'
import { useEventBus } from 'src/common/eventbus'
import { onTabsContextMenu } from './tabs/contextmenu'


export type WorkspaceEvents = {
  'layout-changed'(): void
  // 'leaf:active'(leaf: WorkspaceLeaf): void
  // 'leaf:deactive'(leaf: WorkspaceLeaf): void
  // 'leaf:toggle'(leaf: WorkspaceLeaf): void
}


// TODO move each/find/filter to Node
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
          workspace.activeLeaf = this.findLeaf(leaf => leaf.containerEl === el)
        }))

    this.component.register(draggableTabs(this))

    this.component.registerDomEvent(this.containerEl, 'contextmenu', onTabsContextMenu(this))

    this.component.register(
      decorate(editor.library, 'openFile', fn => (file, callback) => {
        const activeTabs = workspace.activeLeaf?.parent as WorkspaceTabs
        if (
          !MarkdownEditorView.parent ||
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
        if (activeTabs.findLeaf(leaf => leaf.state.path === file)) {
          activeTabs.toggleTab(file)
          return
        }
        activeTabs.appendChild(createEditorLeaf(file))
      }))
  }
}
