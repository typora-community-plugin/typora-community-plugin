import './title-bar.scss'
import decorate from '@plylrnsdy/decorate.js'
import { File, editor } from 'typora'
import { Events } from 'src/common/events'
import { noticeContainer } from './components/notice'
import type { MarkdownEditor } from './editor/markdown-editor'
import type { WorkspaceRibbon } from './ribbon/workspace-ribbon'
import { Sidebar } from './sidebar/sidebar'
import { GlobalSearchView } from './sidebar/search/global-search-view'
import type { FileExplorerEvents } from './sidebar/file-explorer'
import { Outline } from './sidebar/outline'
import { TabsView } from './tabs/tabs-view'
import { SettingsModal } from './settings/settings-modal'
import { CommandModal } from './commands/command-modal'
import { QuickOpenPanel } from './quick-open-panel'
import type { Component } from 'src/common/component'
import { useEventBus } from 'src/common/eventbus'
import { useService } from 'src/common/service'
import { WorkspaceRoot } from './layout/workspace-root'
import type { WorkspaceParent } from './layout/workspace-parent'
import { WorkspaceLeaf } from './layout/workspace-leaf'
import type { ViewState } from './view-manager'
import { EmptyView } from './views/empty-view'
import { MarkdownEditorView } from './views/markdown-editor-view'


export type WorkspaceEvents = {
  'active-leaf:change'(leaf: WorkspaceLeaf): void

  'file:will-open'(path: string): void
  'file:open'(path: string): void
  'file:will-save'(path: string): void

  'file-menu': FileExplorerEvents['contextmenu']
}


export class Workspace extends Events<WorkspaceEvents> {

  private _children: Component[] = []

  ribbon: WorkspaceRibbon
  sidebar: Sidebar
  rootSplit: WorkspaceRoot = new WorkspaceRoot(this)

  private _activeLeaf: WorkspaceLeaf
  //
  get activeLeaf(): WorkspaceLeaf {
    if (!this._activeLeaf?.parent) {
      this.activeLeaf = (this.rootSplit.children[0] as WorkspaceParent)?.children[0] as WorkspaceLeaf
    }
    return this._activeLeaf
  }
  //
  set activeLeaf(leaf: WorkspaceLeaf) {
    this._activeLeaf = leaf
    this.emit('active-leaf:change', leaf)
  }

  activeEditor: MarkdownEditor

  /**
   * Openned file's path
   */
  get activeFile() {
    return File.bundle?.filePath
  }

  constructor(
    app = useEventBus('app'),
    commands = useService('command-manager'),
    viewManager = useService('view-manager'),
  ) {
    super('workspace')

    app.once('load', () => this._emitMissingEvents())

    this._registerEventHooks()

    this._children.push(noticeContainer)
    this._children.push(new SettingsModal())
    this._children.push(this.ribbon = useService('ribbon'))
    this._children.push(this.sidebar = new Sidebar(() => [
      new GlobalSearchView(),
      useService('file-explorer'),
      new Outline(),
    ]))
    this._children.push(new TabsView())
    this._children.push(new CommandModal())
    this._children.push(useService('input-box'))
    this._children.push(useService('quick-pick'))
    this._children.push(new QuickOpenPanel())

    this.activeEditor = useService('markdown-editor')

    setTimeout(() => this._children.forEach(child => child.load()))

    viewManager.registerViewWithExtensions(['md', 'markdown'], 'core.markdown', (leaf, s) => new MarkdownEditorView(leaf, s.state.path))
    viewManager.registerView('core.empty', (leaf) => new EmptyView(leaf))
  }

  createLeaf(state?: ViewState) {
    const leaf = new WorkspaceLeaf()
    if (state) leaf.setState(state)
    return leaf
  }

  getViewByType<T extends new (...args: any) => any>(cls: T) {
    let res = undefined
    this.iterateViews(this as any, (v) => {
      if (v instanceof cls) {
        res = v
        return true
      }
    })
    return res as any as InstanceType<T> | undefined
  }

  /**
   * Iterate all views in view tree.
   *
   * @param callback return `true` to stop iteration
   */
  iterateViews(view: Component, callback: (view: Component) => boolean | void) {
    const children = (<any>view)._children as Component[]
    for (let i = 0; i < children.length; i++) {
      const childView = children[i]
      if (callback(childView)) break
      if (!(<any>childView)._children.length) continue
      this.iterateViews(childView, callback)
    }
  }

  private _emitMissingEvents() {
    if (this.activeFile) {
      this.emit('file:open', this.activeFile)
    }
  }

  private _registerEventHooks() {
    decorate.beforeCall(editor.library, 'openFile', ([file]) => {
      this.emit('file:will-open', file)
    })

    const onFileOpened = File.loadInitData
      ? 'loadInitData'
      : 'loadFile'
    decorate.afterCall(File, onFileOpened, () => {
      if (this.activeFile) {
        setTimeout(() => this.emit('file:open', this.activeFile))
      }
    })

    File.isNode
      ? decorate.beforeCall(File, 'saveUseNode', () => {
        this.emit('file:will-save', this.activeFile)
      })
      : (() => {
        let start = 0

        decorate.afterCall(File, 'validateContentForSave', () => {
          start = Date.now()
        })
        decorate.beforeCall(File, 'sync', () => {
          if (Date.now() - start >= 50) return
          this.emit('file:will-save', this.activeFile)
        })
      })()

    setTimeout(() =>
      useService('file-explorer')._onContextMenu(params => {
        this.emit('file-menu', params)
      }))
  }
}
