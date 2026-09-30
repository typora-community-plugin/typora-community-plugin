import './media-view.scss'
import path from 'src/path'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { WorkspaceView } from '../layout/workspace-view'


export class VideoView extends WorkspaceView {

  static type = 'core.video'

  /** Common video extensions registered to {@link VideoView} */
  static extensions = ['mkv', 'mov', 'mp4', 'ogv', 'webm']

  icon = 'fa-file-video-o'

  containerEl = $('<div class="typ-vidio-view"></div>')[0]

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  get filePath() {
    return this.leaf.state.path
  }

  /** @override */
  onload() {
    const video = $('<video controls></video>')[0] as HTMLVideoElement
    video.src = toFileUrl(this.filePath)
    video.textContent = path.basename(this.filePath)
    this.containerEl.innerHTML = ''
    this.containerEl.appendChild(video)
  }
}

function toFileUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^([^/])/, '/$1')
  return encodeURI('file://' + normalized)
    .replace(/#/g, '%23')
    .replace(/\?/g, '%3F')
}
