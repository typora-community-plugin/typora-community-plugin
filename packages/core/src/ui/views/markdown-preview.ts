import './empty-view.scss'
import { View } from "../common/view"
import { fs } from 'src/index'
import { editor } from 'typora'


export class MarkdownPreview extends View {

  containerEl = $(`<div class="typ-markdown-preview">Markdown Preview</div>`)[0]

  constructor(path: string) {
    super()

    const md = fs.readTextSync(path)
    const  [html] = editor.nodeMap.allNodes.first().__proto__.constructor.parseFrom(md)
    this.containerEl.innerHTML = html
  }

}
