import { editor, type Rangy } from "typora"
import type { MarkdownEditor } from "./markdown-editor"


export class EditorSelection {

  private selected: Rangy | null

  constructor(editor: MarkdownEditor) {
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
