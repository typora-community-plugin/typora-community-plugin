import { useService } from 'src/common/service'
import fs from 'src/io/fs/filesystem'

export class MdPreviewerController {

  constructor(private mdRenderer = useService('markdown-renderer')) { }

  active(containerEl: HTMLElement, path: string) {
    fs.readText(path).then(md =>
      this.mdRenderer.renderTo(md, containerEl))
  }

  deactive(containerEl: HTMLElement) {
    containerEl.innerHTML = ''
  }
}
