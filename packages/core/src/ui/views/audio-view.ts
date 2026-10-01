import './audio-view.scss'
import path from 'src/path'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { WorkspaceView } from '../layout/workspace-view'
import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import type { DisposeFunc } from 'src/utils/types'


export class UseAudioView extends Component {

  private _dispose!: DisposeFunc

  onload(viewManager = useService('view-manager')) {
    this._dispose = viewManager.registerViewWithExtensions(AudioView.extensions, AudioView.type, (leaf) => new AudioView(leaf))
  }

  onunload(): void {
    this._dispose()
  }
}

export class AudioView extends WorkspaceView {

  static type = 'core.audio'

  /** Common audio extensions registered to {@link AudioView} */
  static extensions = ['flac', 'm4a', 'mp3', 'ogg', 'wav', 'webm', '3gp']

  icon = 'fa-file-audio-o'

  containerEl = $('<div class="typ-audio-view"></div>')[0]

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)
  }

  get filePath() {
    return this.leaf.state.path
  }

  /** @override */
  onload() {
    const audio = $('<audio controls></audio>')[0] as HTMLAudioElement
    audio.src = toFileUrl(this.filePath)
    audio.textContent = path.basename(this.filePath)
    this.containerEl.innerHTML = ''
    this.containerEl.appendChild(audio)
  }
}

function toFileUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/').replace(/^([^/])/, '/$1')
  return encodeURI('file://' + normalized)
    .replace(/#/g, '%23')
    .replace(/\?/g, '%3F')
}
