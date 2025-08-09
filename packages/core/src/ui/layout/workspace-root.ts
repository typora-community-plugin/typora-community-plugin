import './workspace-root.scss'
import { editor } from 'typora'
import decorate from '@plylrnsdy/decorate.js'
import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import type { Workspace } from "../workspace"
import { WorkspaceSplit } from "./split"
import type { WorkspaceTabs } from './tabs'
import { draggableTabs } from './tabs/draggable'
import { createEditorLeaf, createTabs, splitDown, splitRight } from './workspace-utils'
import { MarkdownEditorView } from '../views/markdown-editor-view'
import { useEventBus } from 'src/common/eventbus'
import { onTabsContextMenu } from './tabs/contextmenu'


export type WorkspaceEvents = {
  'layout-changed'(): void
  // 'leaf:active'(leaf: WorkspaceLeaf): void
  // 'leaf:deactive'(leaf: WorkspaceLeaf): void
  // 'leaf:toggle'(leaf: WorkspaceLeaf): void
}


export class WorkspaceRoot extends WorkspaceSplit {

  private component = new Component()

  constructor(
    workspace: Workspace,
    commands = useService('command-manager'),
    { t } = useService('i18n'),
    settings = useService('settings'),
  ) {
    super('vertical')

    $(this.containerEl).addClass('typ-workspace-root')

    this.component.onload = () => {
      $(document.body).append(this.containerEl)

      this.component.registerDomEvent(this.containerEl, 'click', e => {
        const el = (e.target as HTMLElement).closest('.typ-workspace-leaf')
        if (!el) return
        workspace.activeLeaf = this.findLeaf(leaf => leaf.containerEl === el)
      })

      this.component.registerDomEvent(this.containerEl, 'contextmenu', onTabsContextMenu(this))

      this.component.register(draggableTabs(this))

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

      this.component.register(
        workspace.on('file-menu', ({ menu, path }) => {
          menu.insertItemAfter('[data-action="open"]', item => {
            item
              .setKey('typ-split-right')
              .setTitle(t.workspace.fileContextMenuSplitRight)
              .onClick(event => splitRight(path))
          })
        }))

      this.component.register(
        commands.register({
          id: 'core.workspace.split-right',
          title: t.workspace.commandSplitRight,
          scope: 'global',
          callback: splitRight,
        }))

      this.component.register(
        commands.register({
          id: 'core.workspace.split-down',
          title: t.workspace.commandSplitDown,
          scope: 'global',
          callback: splitDown,
        }))

      this.component.register(
        commands.register({
          id: 'core.workspace.reset',
          title: t.workspace.commandReset,
          scope: 'global',
          callback: () => {
            this.component.unload()
            this.component.load()
          },
        }))

      this.appendChild(createTabs(workspace.activeFile))
    }

    this.component.onunload = () => {
      this.eachLeaves(leaf => leaf.detach())
      this.children.forEach(child => child.detach())
      this.containerEl.remove()
      editor.writingArea.parentElement.setAttribute('class', '')
      MarkdownEditorView.parent = null
    }

    settings.onChange('useWorkspace', (_, isEnabled) => {
      isEnabled ? this.component.load() : this.component.unload()
    })

    setTimeout(() => {
      settings.get('useWorkspace') ? this.component.load() : this.component.unload()
    })
  }
}
