import { editor, type Rangy } from "typora"
import { useEventBus } from "src/common/eventbus"


export class EditorSelection {

  private selected: Rangy | null

  constructor() {
    const editor = useEventBus('markdown-editor')

    editor.on('edit', () => {
      this.selected = null
    })
  }

  save() {
    this.selected = editor.selection.getRangy()
  }

  restore() {
    this.selected?.select()
  }

}
