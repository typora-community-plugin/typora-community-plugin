import './file-tabs.scss'
import { useService } from "src/common/service"
import path from "src/path"
import { Tab, TabContainer } from "src/ui/components/tabs"
import { truncate } from "src/utils"


const MAX_LENGHT = { length: 20, omission: '…' }

export class FileTabContainer extends TabContainer {

  static hideTabExtension(isHide: boolean) {
    $(document.body).toggleClass('typ-file-ext--hide', isHide)
  }
}

export class FileTab extends Tab {
  constructor(filePath: string, vault = useService('vault')) {
    const longPath = path.relative(vault.path, filePath)
      .replace(/(\.textbundle)[\\/]text\.(?:md|markdown)$/, '$1')
    const ext = path.extname(filePath)
    const shortName = truncate(path.basename(longPath, ext), MAX_LENGHT)

    super({
      id: filePath,
      text: () => $(`<span>${shortName}</span><span class="typ-file-ext">${ext}</span>`),
      title: longPath,
    })
  }
}
