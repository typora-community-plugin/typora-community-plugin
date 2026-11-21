import './image-view.scss'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { MediaView, UseMediaView } from './media-view'


export class UseImageView extends UseMediaView {
  constructor() {
    super(ImageView)
  }
}

export class ImageView extends MediaView {

  static type = 'core.image'

  /** Common image extensions registered to {@link ImageView} */
  static extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'avif']

  icon = 'fa-file-image-o'

  constructor(leaf: WorkspaceLeaf) {
    super(leaf, 'typ-image-view')
  }

  /** @override */
  protected createMediaEl(basename: string) {
    const img = $('<img>')[0] as HTMLImageElement
    img.alt = basename
    return img
  }
}
