import './audio-view.scss'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { MediaView, UseMediaView } from './media-view'


export class UseAudioView extends UseMediaView {
  constructor() {
    super(AudioView)
  }
}

export class AudioView extends MediaView {

  static type = 'core.audio'

  /** Common audio extensions registered to {@link AudioView} */
  static extensions = ['flac', 'm4a', 'mp3', 'ogg', 'wav', '3gp']

  icon = 'fa-file-audio-o'

  constructor(leaf: WorkspaceLeaf) {
    super(leaf, 'typ-audio-view')
  }

  /** @override */
  protected createMediaEl(basename: string) {
    const audio = $('<audio controls></audio>')[0] as HTMLAudioElement
    audio.textContent = basename
    return audio
  }
}
