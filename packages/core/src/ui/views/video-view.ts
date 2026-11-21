import './video-view.scss'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { MediaView, UseMediaView } from './media-view'


export class UseVideoView extends UseMediaView {
  constructor() {
    super(VideoView)
  }
}

export class VideoView extends MediaView {

  static type = 'core.video'

  /** Common video extensions registered to {@link VideoView} */
  static extensions = ['mkv', 'mov', 'mp4', 'ogv', 'webm']

  icon = 'fa-file-video-o'

  constructor(leaf: WorkspaceLeaf) {
    super(leaf, 'typ-video-view')
  }

  /** @override */
  protected createMediaEl(basename: string) {
    const video = $('<video controls></video>')[0] as HTMLVideoElement
    video.textContent = basename
    return video
  }
}
