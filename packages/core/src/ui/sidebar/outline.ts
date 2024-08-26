import { View } from 'src/ui/view'
import { BUILT_IN } from "src/ui/ribbon/workspace-ribbon"
import { editor } from "typora"
import { html } from "src/utils"
import { useService } from 'src/common/service'


export class Outline extends View {

  constructor(
    i18n = useService('i18n'),
    ribbon = useService('ribbon'),
    sidebar = useService('sidebar'),
  ) {
    super()

    this.containerEl = document.getElementById('outline-content') as HTMLElement

    ribbon.addButton({
      [BUILT_IN]: true,
      id: 'core.outline',
      title: i18n.t.ribbon.outline,
      icon: html`<i class="fa fa-list typ-lighter-icon"></i>`,
      onclick: () => sidebar.switch(Outline),
    })
  }

  onunload() {
    this.containerEl.style.display = ''
  }

  show() {
    editor.library.switch("outline")
    super.show()
  }

  hide() {
    this.containerEl.parentElement!.classList.remove('active-tab-outline')
    super.hide()
  }

}
