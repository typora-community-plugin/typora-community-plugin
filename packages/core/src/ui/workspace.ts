import './title-bar.scss'
import type { App } from 'src/app'
import type { Component } from 'src/component'
import { NoticeContainer } from 'src/components/notice'
import { Events } from 'src/events'
import { MarkdownEditor } from './editor/markdown-editor'
import { WorkspaceRibbon } from './ribbon/workspace-ribbon'
import { Sidebar } from './sidebar/sidebar'
import { TabsView } from './tabs/tabs-view'
import { SettingsModal } from 'src/settings/settings-modal'
import { CommandModal } from 'src/command/command-modal'
import { QuickOpenPanel } from './quick-open-panel'
import decorate from '@plylrnsdy/decorate.js'
import { File, editor } from 'typora'


type WorkspaceEvents = {
  'file:will-open'(path: string): void
  'file:open'(path: string): void
  'file:will-save'(path: string): void
}

export class Workspace extends Events<WorkspaceEvents> {

  activeEditor: MarkdownEditor

  /**
   * Openned file's path
   */
  get activeFile() {
    return File.bundle?.filePath
  }

  private _children: Component[] = []

  constructor(app: App) {
    super()

    this._registerEventHooks()

    this.activeEditor = new MarkdownEditor(app)

    this._children.push(new NoticeContainer())
    this._children.push(new SettingsModal(app))
    this._children.push(new WorkspaceRibbon(app))
    this._children.push(new Sidebar(app, this))
    this._children.push(new TabsView(app))
    this._children.push(new CommandModal(app))
    this._children.push(new QuickOpenPanel(app))

    setTimeout(() => this._children.forEach(child => child.load()))

    app.once('load', () => this._emitMissingEvent())
  }

  getViewByType<T extends new (...args: any) => any>(cls: T) {
    return this._children.find(view => view instanceof cls) as InstanceType<T> | undefined
  }

  private _emitMissingEvent() {
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

    decorate.beforeCall(File, 'saveUseNode', () => {
      this.emit('file:will-save', this.activeFile)
    })
  }
}
