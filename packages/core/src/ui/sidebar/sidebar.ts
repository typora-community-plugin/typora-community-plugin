import './sidebar.scss'
import { editor } from "typora"
import { useService } from "src/common/service"
import { View } from "src/ui/common/view"
import type { DisposeFunc } from "src/utils/types"
import { FileExplorer } from "./file-explorer"
import { Component } from 'src/common/component'
import type { SidebarPanel } from './sidebar-panel'


/**
 * @example
 *
 * ```js
 * // Get instance
 * const sidebar = app.workspace.sidebar
 * ```
 */
export class Sidebar extends Component {

  private container = new SidebarContainer()

  private activeView: SidebarPanel
  private internalPanels: SidebarPanel[] = []
  private panels: SidebarPanel[] = []

  constructor(
    internalPanels: () => SidebarPanel[],
    private settings = useService('settings'),
  ) {
    super()


    setTimeout(() => {
      this.internalPanels = internalPanels()
      this.internalPanels.forEach(view => this.addChild(view))
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
    this.panels.forEach((panel) => this.addChild(panel))
  }

  onunload() {
    if (!this.internalPanels.includes(this.activeView)) {
      this.switch(FileExplorer)
    }
  }

  addChild(panel: any): DisposeFunc {
    if (!this.internalPanels.includes(panel) && panel.el) {
      this.container.addPanel(panel)
    }

    // @deprecated
    (<SidebarPanel>panel).load()

    this.container.containerEl.append(panel.containerEl)

    this.panels.push(panel)
    return () => this.removeChild(panel)
  }

  removeChild(panel: any): void {
    if (this.internalPanels.includes(panel)) {
      return
    }
    if (this.panels.includes(panel)) {
      this.panels = this.panels.filter((v) => v !== panel)
      panel.el?.remove();

      // @deprecated
      (<SidebarPanel>panel).unload()
    }
  }

  get isShown() {
    return editor.library.isSidebarShown()
  }

  switch<T extends SidebarPanel>(viewClass: new (...args: any[]) => T) {
    if (this.activeView instanceof viewClass) {
      this.toggle()
      return
    }

    Object.values(this.internalPanels).forEach(v => v.hide())
    this.activeView?.hide()

    this.activeView = this.panels.find(c => c instanceof viewClass)!
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

class SidebarContainer extends View {

  wrapperEl: HTMLElement

  constructor() {
    super()

    this.containerEl = document.getElementById('sidebar-content')!
    this.wrapperEl = this.containerEl.parentElement
  }

  addPanel(panel: SidebarPanel) {
    this.containerEl.append(panel.containerEl)
  }
}

