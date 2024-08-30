import './sidebar.scss'
import { editor } from "typora"
import { useService } from "src/common/service"
import { View } from "src/ui/view"
import type { DisposeFunc } from "src/utils/types"
import { FileExplorer } from "./file-explorer"


/**
 * @example
 *
 * ```js
 * // Get instance
 * const sidebar = app.workspace.sidebar
 * ```
 */
export class Sidebar extends View {

  wrapperEl: HTMLElement

  activeView: View
  internalViews: View[]

  constructor(
    internalViews: () => View[],
    private settings = useService('settings'),
  ) {
    super()

    this.containerEl = document.getElementById('sidebar-content')!
    this.wrapperEl = this.containerEl.parentElement

    setTimeout(() => {
      this.internalViews = internalViews()
      this.internalViews.forEach(view => this.addChild(view))
    }, 1)

    settings.onChange('showRibbon', (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  load() {
    if (!this.settings.get('showRibbon')) {
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

  addChild(component: View): DisposeFunc {
    const dispose = super.addChild(component)

    if (!this.internalViews.includes(component) && component.containerEl) {
      this.containerEl.append(component.containerEl)
    }
    return dispose
  }

  get isShown() {
    return editor.library.isSidebarShown()
  }

  switch<T extends View>(viewClass: new (...args: any[]) => T) {
    if (this.activeView instanceof viewClass) {
      this.toggle()
      return
    }

    Object.values(this.internalViews).forEach(v => v.hide())
    this.activeView?.hide()

    this.activeView = this._children.find(c => c instanceof viewClass)! as View
    this.activeView.show()
  }

  toggle() {
    this.isShown ? this.hide() : this.show()
  }

  show() {
    editor.library.showSidebar()
    this.activeView?.show()
  }

  hide() {
    editor.library.hideSidebar()
    this.activeView?.hide()
  }
}
