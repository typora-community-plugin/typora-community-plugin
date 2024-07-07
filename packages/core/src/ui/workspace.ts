import './title-bar.scss'
import decorate from '@plylrnsdy/decorate.js'
import { File, editor } from 'typora'
import type { App } from 'src/app'
import { noticeContainer } from 'src/components/notice'
import { Events } from 'src/events'
import { MarkdownEditor } from './editor/markdown-editor'
import { WorkspaceRibbon } from './ribbon/workspace-ribbon'
import { Sidebar } from './sidebar/sidebar'
import { GlobalSearch } from './sidebar/search'
import { FileExplorer } from './sidebar/file-explorer'
import { Outline } from './sidebar/outline'
import { TabsView } from './tabs/tabs-view'
import { SettingsModal } from 'src/settings/settings-modal'
import { CommandModal } from 'src/command/command-modal'
import { QuickOpenPanel } from './quick-open-panel'
import { _emitMissingEvents } from 'src/symbols'
import type { View } from './view'


type WorkspaceEvents = {
  'file:will-open'(path: string): void
  'file:open'(path: string): void
  'file:will-save'(path: string): void
}

export class Workspace extends Events<WorkspaceEvents> {

  private _children: View[] = []

  ribbon: WorkspaceRibbon
  sidebar: Sidebar

  activeEditor: MarkdownEditor

  /**
   * Openned file's path
   */
  get activeFile() {
    return File.bundle?.filePath
  }

  constructor(app: App) {
    super()

    this._registerEventHooks()

    this._children.push(noticeContainer)
    this._children.push(new SettingsModal(app))
    this._children.push(this.ribbon = new WorkspaceRibbon(app))
    this._children.push(this.sidebar = new Sidebar(app, [
      new GlobalSearch(app, this),
      new FileExplorer(app, this),
      new Outline(app, this),
    ]))
    this._children.push(new TabsView(app))
    this._children.push(new CommandModal(app))
    this._children.push(new QuickOpenPanel(app))

    this.activeEditor = new MarkdownEditor(app)

    setTimeout(() => this._children.forEach(child => child.load()))
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
  iterateViews(view: View, callback: (view: View) => boolean | void) {
    const children = (<any>view)._children as View[]
    for (let i = 0; i < children.length; i++) {
      const childView = children[i]
      if (callback(childView)) break
      if (!(<any>childView)._children.length) continue
      this.iterateViews(childView, callback)
    }
  }

  /**
   * @private
   */
  [_emitMissingEvents]() {
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
  }
}
