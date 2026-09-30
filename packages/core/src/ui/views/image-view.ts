import './image-view.scss'
import path from 'src/path'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { WorkspaceView } from '../layout/workspace-view'


export class ImageView extends WorkspaceView {

  static type = 'core.image'

  /** Common image extensions registered to {@link ImageView} */
  static extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'avif']

  icon = 'fa-file-image-o'

  containerEl = $('<div class="typ-image-view"></div>')[0]

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  get filePath() {
    return this.leaf.state.path
  }

  /** @override */
  onload() {
    const img = $('<img>')[0] as HTMLImageElement
    img.src = toFileUrl(this.filePath)
    img.alt = path.basename(this.filePath)
    this.containerEl.innerHTML = ''
    this.containerEl.appendChild(img)
  }
}

function toFileUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^([^/])/, '/$1')
  return encodeURI('file://' + normalized)
    .replace(/#/g, '%23')
    .replace(/\?/g, '%3F')
}
