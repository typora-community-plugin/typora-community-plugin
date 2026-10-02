import './title-bar.scss'
import decorate from '@plylrnsdy/decorate.js'
import { File, editor } from 'typora'
import { Events } from 'src/common/events'
import { noticeContainer } from './components/notice'
import type { MarkdownEditor, MarkdownEditorEvents } from './editor/markdown-editor'
import type { WorkspaceRibbon } from './ribbon/workspace-ribbon'
import { Sidebar } from './sidebar/sidebar'
import { GlobalSearchView } from './sidebar/search/views/global-search-view'
import type { FileExplorerEvents } from './sidebar/file-explorer'
import { Outline } from './sidebar/outline'
import { CommandModal } from './commands/command-modal'
import { QuickOpenPanel } from './quick-open-panel'
import type { Component } from 'src/common/component'
import { useEventBus } from 'src/common/eventbus'
import { useService } from 'src/common/service'
import { WorkspaceRoot } from './layout/workspace-root'
import { WorkspaceFloating } from './layout/floating'
import type { WorkspaceLeaf } from './layout/workspace-leaf'
import { useActiveLeaf } from './layout/use-active-leaf'
import { createLeaf } from './layout/workspace-utils'
import { EmptyView } from './views/empty-view'
import { UseAudioView } from './views/audio-view'
import { UseVideoView } from './views/video-view'
import { UseImageView } from './views/image-view'
import { MarkdownView } from './views/markdown-view'
import { WorkspaceSidedock } from './layout/sidedock'
import { useSettingEffectedFeature } from 'src/settings/use-setting-effect'


export type WorkspaceEvents = {
  'active-leaf:change'(leaf: WorkspaceLeaf): void

  'file:will-open'(path: string): void
  'file:open'(path: string): void
  'file:will-save'(path: string): void

  'file-menu': FileExplorerEvents['contextmenu']
  'editor-menu': MarkdownEditorEvents['contextmenu']
}


export class Workspace extends Events<WorkspaceEvents> {

  private _children: Component[] = []

  ribbon: WorkspaceRibbon
  sidebar: Sidebar
  rootSplit: WorkspaceRoot = new WorkspaceRoot(this)

  /**
   * Floating container: holds views detached from the main layout (rootSplit).
   */
  floatingSplit: WorkspaceFloating = new WorkspaceFloating()

  /**
   * Right side dock panel.
   * Similar to Obsidian's `workspace.rightSplit`.
   *
   * @since v2.10.0
   */
  rightSplit: WorkspaceSidedock

  get activeLeaf(): WorkspaceLeaf | null {
    const [getActiveLeaf] = useActiveLeaf()
    return getActiveLeaf()
  }
  set activeLeaf(leaf: WorkspaceLeaf | null) {
    const [, setActiveLeaf] = useActiveLeaf()
    setActiveLeaf(leaf)
  }

  activeEditor: MarkdownEditor

  /**
   * Openned file's path
   */
  get activeFile() {
    return File.filePath ?? File.bundle.filePath
  }

  constructor(
    app = useEventBus('app'),
    viewManager = useService('view-manager'),
  ) {
    super('workspace')

    // Create right side dock with toggle callback
    this.rightSplit = new WorkspaceSidedock('right', this)

    app.once('load', () => this._emitMissingEvents())

    this._registerEventHooks()

    this._children.push(noticeContainer)
    this._children.push(useService('settings-modal'))
    this._children.push(this.ribbon = useService('ribbon'))
    this._children.push(this.sidebar = new Sidebar(() => [
      new GlobalSearchView(),
      useService('file-explorer'),
      new Outline(),
    ]))
    this._children.push(new CommandModal())
    this._children.push(useService('input-box'))
    this._children.push(useService('quick-pick'))
    this._children.push(new QuickOpenPanel())

    this.activeEditor = useService('markdown-editor')

    setTimeout(() => this._children.forEach(child => child.load()))

    // Insert rightSplit into DOM (position: fixed, so it floats independently)
    document.body.appendChild(this.rightSplit.containerEl)

    viewManager.registerViewWithExtensions(MarkdownView.extensions, MarkdownView.type, (leaf) => new MarkdownView(leaf))
    viewManager.registerView(EmptyView.type, (leaf) => new EmptyView(leaf))
    useSettingEffectedFeature('useAudioView', new UseAudioView())
    useSettingEffectedFeature('useImageView', new UseImageView())
    useSettingEffectedFeature('useVideoView', new UseVideoView())
  }

  createLeaf = createLeaf

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

  /**
   * Iterate all leaves in the whole layout tree (rootSplit + floatingSplit + rightSplit).
   *
   * @param callback return `true` to stop iteration
   */
  eachLeaves(callback: (leaf: WorkspaceLeaf) => boolean | void) {
    this.rootSplit.eachLeaves(callback)
    this.floatingSplit.eachLeaves(callback)
    this.rightSplit.eachLeaves(callback)
  }

  findLeaf<L extends WorkspaceLeaf = WorkspaceLeaf>(iteratee: (leaf: WorkspaceLeaf) => boolean): L | null {
    return this.rootSplit.findLeaf(iteratee) ?? this.floatingSplit.findLeaf(iteratee) ?? this.rightSplit.findLeaf(iteratee)
  }

  filterLeaves<L extends WorkspaceLeaf = WorkspaceLeaf>(iteratee: (leaf: WorkspaceLeaf) => boolean): L[] {
    return [
      ...this.rootSplit.filterLeaves(iteratee),
      ...this.floatingSplit.filterLeaves(iteratee),
      ...this.rightSplit.filterLeaves(iteratee),
    ] as L[]
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

    // @ts-ignore
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

    setTimeout(() => {
      useService('file-explorer')._onContextMenu(params => {
        this.emit('file-menu', params)
      })
      useService('markdown-editor')._onContextMenu(params => {
        this.emit('editor-menu', params)
      })
    })
  }
}
