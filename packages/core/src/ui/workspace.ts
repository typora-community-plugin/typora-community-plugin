import './title-bar.scss'
import decorate from '@plylrnsdy/decorate.js'
import { File, editor } from 'typora'
import { Events } from 'src/common/events'
import { noticeContainer } from './components/notice'
import type { MarkdownEditor } from './editor/markdown-editor'
import type { WorkspaceRibbon } from './ribbon/workspace-ribbon'
import { Sidebar } from './sidebar/sidebar'
import { GlobalSearchView } from './sidebar/search/views/global-search-view'
import type { FileExplorerEvents } from './sidebar/file-explorer'
import { Outline } from './sidebar/outline'
import { SettingsModal } from './settings/settings-modal'
import { CommandModal } from './commands/command-modal'
import { QuickOpenPanel } from './quick-open-panel'
import type { Component } from 'src/common/component'
import { useEventBus } from 'src/common/eventbus'
import { useService } from 'src/common/service'
import { WorkspaceRoot } from './layout/workspace-root'
import { WorkspaceFloating, createFloating } from './layout/floating'
import type { WorkspaceLeaf } from './layout/workspace-leaf'
import { useActiveLeaf } from './layout/use-active-leaf'
import { createLeaf } from './layout/workspace-utils'
import { EmptyView } from './views/empty-view'
import { MarkdownView } from './views/markdown-view'
import { WorkspaceSidedock } from './layout/sidedock'


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

  /**
   * Floating container: holds views detached from the main layout (rootSplit).
   */
  floatingSplit: WorkspaceFloating = createFloating()

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
    this.rightSplit = new WorkspaceSidedock('right', (collapsed) => {
      if (collapsed) {
        document.body.classList.remove('is-right-sidedock-open')
      } else {
        document.body.classList.add('is-right-sidedock-open')
      }
    })

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
    this._children.push(new CommandModal())
    this._children.push(useService('input-box'))
    this._children.push(useService('quick-pick'))
    this._children.push(new QuickOpenPanel())

    this.activeEditor = useService('markdown-editor')

    setTimeout(() => this._children.forEach(child => child.load()))

    // Insert rightSplit into DOM (position: fixed, so it floats independently)
    document.body.appendChild(this.rightSplit.containerEl)

    viewManager.registerViewWithExtensions(['md', 'markdown'], MarkdownView.type, (leaf, s) => new MarkdownView(leaf))
    viewManager.registerView(EmptyView.type, (leaf) => new EmptyView(leaf))
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

  // ── Right Side Dock API ──────────────────────────────────────────────

  /**
   * Get or create a leaf in the right side dock.
   *
   * @param createTabs - If true and no tabs container exists, create one first.
   * @returns The leaf, or null if the dock is collapsed and `createTabs` is false.
   */
  getRightLeaf(createTabs = true): WorkspaceLeaf | null {
    const sidedock = this.rightSplit

    // If collapsed and not creating tabs, try to expand first
    if (sidedock.collapsed && !createTabs) {
      return null
    }

    // Ensure the dock is expanded
    if (sidedock.collapsed) {
      sidedock.expand()
    }

    // Find existing tabs container or create one
    let tabs = sidedock.children.find(c => c.type === 'tabs') as any
    if (!tabs) {
      const newTabs = useService('workspace-tabs')
      sidedock.appendChild(newTabs)
      tabs = newTabs
    }

    // If no leaf in tabs, create one
    if (tabs.children.length === 0) {
      const leaf = createLeaf()
      tabs.appendChild(leaf)
      return leaf
    }

    // Return the last leaf
    const lastChild = tabs.children[tabs.children.length - 1]
    if (lastChild && lastChild.isLeaf()) {
      return lastChild as WorkspaceLeaf
    }

    return null
  }

  /**
   * Ensure a view of the given type is open in the right side dock.
   * If an existing leaf of that type exists, reuse it; otherwise create a new one.
   *
   * @example
   * ```js
   * app.workspace.ensureSideLeaf('my-panel', 'right', { active: true })
   * ```
   */
  ensureSideLeaf(type: string, side: 'right', options?: { active?: boolean; state?: Record<string, any> }) {
    if (side !== 'right') {
      throw new Error(`[Workspace] Only 'right' side is supported at this time.`)
    }

    const sidedock = this.rightSplit
    const leaves = sidedock.filterLeaves(leaf => leaf.viewType === type)

    let targetLeaf: WorkspaceLeaf | null = null

    if (leaves.length === 0) {
      // Create a new leaf in the right dock
      targetLeaf = this.getRightLeaf(true)
      if (targetLeaf) {
        targetLeaf.setState({ type, state: options?.state })
      }
    } else {
      // Reuse existing leaf
      targetLeaf = leaves[0]
      if (options?.state) {
        targetLeaf.setState({ type, state: options.state })
      }
    }

    if (targetLeaf) {
      // Expand the dock if collapsed
      if (sidedock.collapsed) {
        sidedock.expand()
      }
      if (options?.active) {
        this.activeLeaf = targetLeaf
      }
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

    setTimeout(() =>
      useService('file-explorer')._onContextMenu(params => {
        this.emit('file-menu', params)
      }))
  }
}
