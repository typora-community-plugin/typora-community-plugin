import './markdown-preview.scss'
import { fs } from 'src/index'
import { editor } from 'typora'
import { WorkspaceView } from '../layout/workspace-view'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'


export class MarkdownPreview extends WorkspaceView {

  containerEl = $(`<div class="typ-markdown-preview">Markdown Preview</div>`)[0]

  constructor(leaf: WorkspaceLeaf, private path: string) {
    super(leaf)
  }

  onOpen(): void {
    const md = fs.readTextSync(this.path)
    const [html] = editor.nodeMap.allNodes.first().__proto__.constructor.parseFrom(md)
    this.containerEl.innerHTML = html.replace(/ contenteditable='true'/g, '')
  }

  onClose(): void {
      this.containerEl.innerHTML = ''
  }
}
