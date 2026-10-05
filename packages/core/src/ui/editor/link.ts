import decorate from "@plylrnsdy/decorate.js"
import { editor } from "typora"
import { Component } from "src/common/component"
import { useService } from "src/common/service"
import path from "src/path"
import { isCustomProtocolUrl } from "src/utils"
import { useSettingEffectedFeature } from "src/settings/use-setting-effect"


const tryOpenUrl = editor.tryOpenUrl_ ? 'tryOpenUrl_' : 'tryOpenUrl'

export class MarkdownLinkWitoutExtension extends Component {

  constructor() {
    super()

    useSettingEffectedFeature('mdLinkWithoutExtension', this)
  }

  onload() {
    this.register(
      decorate.parameters(editor, tryOpenUrl, ([url, param1]) => {
        if (!(url.startsWith('#') || url.startsWith('http'))) {
          let [filepath, hash] = url.split('#')
          const ext = path.extname(filepath)
          if (!ext) {
            filepath += '.md'
          }
          url = filepath + (hash ? `#${hash}` : '')
        }
        return [url, param1]
      }))
  }
}

export class OpenLinkInCurrentWin extends Component {

  constructor() {
    super()

    useSettingEffectedFeature('openLinkInCurrentWin', this)
  }

  onload() {
    this.register(
      decorate(editor, tryOpenUrl, fn => (url, param1) => {

        // handle: file path
        if (!(url.startsWith('#') || url.startsWith('http') || isCustomProtocolUrl(url))) {
          useService('app').openFile(decodeURIComponent(url))
          return
        }

        // handle: only anchor `#anchor`
        // handle: http url
        return fn(url, param1)
      }))
  }
}
