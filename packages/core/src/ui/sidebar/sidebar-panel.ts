import { useService } from "src/common/service"
import { View } from "src/ui/common/view"
import { RibbonItemButton } from "src/ui/ribbon/workspace-ribbon"


export class SidebarPanel extends View {
  constructor(
    protected ribbon = useService('ribbon'),
    protected sidebar = useService('sidebar'),
  ) {
    super()
  }

  show() {
    this.sidebar.container.addPanel(this)
    this.onshow()
  }

  onshow() { }

  hide() {
    this.sidebar.container.removePanel(this)
    this.onhide()
  }

  onhide() { }

  addRibbonButton(button: Omit<RibbonItemButton, 'onclick'>) {
    this.ribbon.addButton({
      ...button,
      // @ts-ignore
      onclick: () => this.sidebar.switch(this.constructor)
    })
  }


  /**
   * @deprecated compatible with old api (<=2.2.22)
   */
  load() {
    this.onload()
  }

  /**
   * Use `onshow` instead.
   * @deprecated compatible with old api (<=2.2.22)
   */
  onload() { }

  /**
   * @deprecated compatible with old api (<=2.2.22)
   */
  unload() {
    this.onunload()
  }

  /**
   * Use `onhide` instead.
   * @deprecated compatible with old api (<=2.2.22)
   */
  onunload() { }
}

export class InternalSidebarPanel extends SidebarPanel {
  constructor() {
    super()
  }

  show() {
    this.onshow()
  }

  hide() {
    this.onhide()
  }
}
