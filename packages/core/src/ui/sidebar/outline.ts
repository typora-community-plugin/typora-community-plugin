import { BUILT_IN } from "src/ui/ribbon/workspace-ribbon"
import { editor } from "typora"
import { html } from "src/utils"
import { useService } from 'src/common/service'
import { InternalSidebarPanel } from './sidebar-panel'


export class Outline extends InternalSidebarPanel {

  constructor(
    i18n = useService('i18n'),
  ) {
    super()

    this.containerEl = document.getElementById('outline-content') as HTMLElement

    this.addRibbonButton({
      [BUILT_IN]: true,
      id: 'core.outline',
      title: i18n.t.ribbon.outline,
      icon: html`<i class="fa fa-list typ-lighter-icon"></i>`,
    })
  }

  onshow() {
    editor.library.switch("outline")
    this.containerEl.style.display = 'block'
  }

  onhide() {
    this.containerEl.parentElement!.classList.remove('active-tab-outline')
    this.containerEl.style.display = 'none'
  }

}
