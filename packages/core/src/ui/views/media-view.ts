import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import path from 'src/path'
import { toFileUrl } from 'src/utils/string/to-file-url'
import type { DisposeFunc } from 'src/utils/types'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { WorkspaceView } from '../layout/workspace-view'


/** Constructor of a {@link MediaView} subclass with its static registration info. */
export interface MediaViewClass {
  type: string
  extensions: string[]
  new(leaf: WorkspaceLeaf): MediaView
}

/** Base class for views that preview media files (image/audio/video). */
export abstract class MediaView extends WorkspaceView {

  constructor(
    leaf: WorkspaceLeaf,
    containerClass: string,
  ) {
    super(leaf)
    this.containerEl = $(`<div class="${containerClass}"></div>`)[0]
  }

  get filePath() {
    return this.leaf.state.path
  }

  /**
   * Create the media element that previews {@link MediaView.filePath}.
   * The element's `src` is assigned by this base class.
   * @param basename basename of {@link MediaView.filePath}, for accessible text
   */
  protected abstract createMediaEl(basename: string): HTMLImageElement | HTMLMediaElement

  /** @override */
  onload() {
    const mediaEl = this.createMediaEl(path.basename(this.filePath))
    mediaEl.src = toFileUrl(this.filePath)
    this.containerEl.innerHTML = ''
    this.containerEl.appendChild(mediaEl)
  }
}

/** Registers a {@link MediaView} subclass to open its media files in the workspace. */
export abstract class UseMediaView extends Component {

  private _dispose!: DisposeFunc

  constructor(private viewClass: MediaViewClass) {
    super()
  }

  onload(viewManager = useService('view-manager')) {
    const { type, extensions } = this.viewClass
    this._dispose = viewManager.registerViewWithExtensions(extensions, type, (leaf) => new this.viewClass(leaf))
  }

  onunload(): void {
    this._dispose()
  }
}
