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
    this.onshow()
  }

  onshow() { }

  hide() {
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
    // @ts-ignore
    this.onload?.()
  }

  /**
   * @deprecated compatible with old api (<=2.2.22)
   */
  unload() {
    // @ts-ignore
    this.onunload?.()
  }
}
