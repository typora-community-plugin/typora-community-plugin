import { View } from "src/ui/view"
import type { App } from "src/app"
import type { Workspace } from "src/ui/workspace"
import { FileExplorer } from "./file-explorer"
import { Outline } from "./outline"
import { Search } from "./search"


export class Sidebar extends View {

  wrapperEl: HTMLElement

  activeView: View
  internalViews: View[]

  constructor(private app: App, workspace: Workspace) {
    super()

    this.containerEl = document.getElementById('sidebar-content')!
    this.wrapperEl = this.containerEl.parentElement

    this.internalViews = [
      new Search(app, workspace, this),
      new FileExplorer(app, workspace, this),
      new Outline(app, workspace, this),
    ]

    this.internalViews.forEach(view => this.addChild(view))

    this.app.settings.onChange('showRibbon', (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  load() {
    if (!this.app.settings.get('showRibbon')) {
      return
    }
    super.load()
  }

  onload() {
    this._children.forEach((view: View) => {
      view.load()
      if (!this.internalViews.includes(view) && view.containerEl) {
        this.containerEl.append(view.containerEl)
      }
    })
  }

  onunload() {
    if (!this.internalViews.includes(this.activeView)) {
      this.switch(FileExplorer)
    }
  }

  addChild(component: View) {
    const dispose = super.addChild(component)

    if (!this.internalViews.includes(component) && component.containerEl) {
      this.containerEl.append(component.containerEl)
    }
    return dispose
  }

  switch<T extends View>(viewClass: new (...args: any[]) => T) {
    if (this.activeView instanceof viewClass) return

    Object.values(this.internalViews).forEach(v => v.hide())
    this.activeView?.hide()

    this.activeView = this._children.find(c => c instanceof viewClass)! as View
    this.activeView.show()
  }
}
