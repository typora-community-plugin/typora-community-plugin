import './sidebar.scss'
import { editor } from "typora"
import { useService } from "src/common/service"
import { View } from "src/ui/common/view"
import type { DisposeFunc } from "src/utils/types"
import { FileExplorer } from "./file-explorer"
import { Component } from 'src/common/component'
import type { SidebarPanel } from './sidebar-panel'
import { ViewLegacy } from '../common/view-legacy'


/**
 * @example
 *
 * ```js
 * // Get instance
 * const sidebar = app.workspace.sidebar
 * ```
 */
export class Sidebar extends Component {

  container = new SidebarContainer()

  private activePanel: SidebarPanel
  private internalPanels: SidebarPanel[] = []
  private panels: SidebarPanel[] = []

  constructor(
    internalPanels: () => SidebarPanel[],
    private ribbon = useService('ribbon'),
  ) {
    super()

    setTimeout(() => {
      this.internalPanels = internalPanels()
      this.internalPanels.forEach(view => this.addPanel(view))
    }, 1)
  }

  addPanel(panel: SidebarPanel): DisposeFunc {
    // @deprecated
    if (panel instanceof ViewLegacy) {
      panel.load()
      this.container.addPanel(panel)
    }

    if (panel.ribbonButton) {
      this.ribbon.addButton(panel.ribbonButton)
    }

    this.panels.push(panel)
    return () => this.removePanel(panel)
  }

  /**
   * Use `addPanel` instead.
   * @deprecated compatible with old api (<=2.2.22)
   */
  addChild(panel: any): DisposeFunc {
    return this.addPanel(panel)
  }

  removePanel(panel: SidebarPanel): void {
    if (panel.ribbonButton) {
      this.ribbon.removeButton(panel.ribbonButton)
    }

    this.panels = this.panels.filter((v) => v !== panel)

    // @deprecated
    if (panel instanceof ViewLegacy) {
      panel.unload()
      this.container.removePanel(panel)
    }
  }

  /**
   * Use `removePanel` instead.
   * @deprecated compatible with old api (<=2.2.22)
   */
  removeChild(panel: any): void {
    this.removePanel(panel)
  }

  get isShown() {
    return editor.library.isSidebarShown()
  }

  switch<T extends SidebarPanel>(viewClass: new (...args: any[]) => T) {
    if (this.activePanel instanceof viewClass) {
      this.toggle()
      return
    }

    Object.values(this.internalPanels).forEach(v => v.hide())
    this.hide()

    this.activePanel = this.panels.find(c => c instanceof viewClass)!
    this.show()
  }

  toggle() {
    this.isShown ? this.hide() : this.show()
  }

  show() {
    editor.library.showSidebar()
    this.activePanel?.show()
  }

  hide() {
    editor.library.hideSidebar()
    this.activePanel?.hide()
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

  removePanel(panel: SidebarPanel) {
    panel.containerEl.remove()
  }
}

