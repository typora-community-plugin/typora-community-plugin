import decorate from "@plylrnsdy/decorate.js"
import { editor } from "typora"
import { Component } from "src/common/component"
import { useService } from "src/common/service"
import path from "src/path"


const tryOpenUrl = editor.tryOpenUrl_ ? 'tryOpenUrl_' : 'tryOpenUrl'

export class MarkdownLinkWitoutExtension extends Component {

  constructor(
    settings = useService('settings')
  ) {
    super()

    const SETTING_KEY = 'mdLinkWithoutExtension'

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
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

  constructor(
    settings = useService('settings')
  ) {
    super()

    const SETTING_KEY = 'openLinkInCurrentWin'

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    this.register(
      decorate(editor, tryOpenUrl, fn => (url, param1) => {

        // handle: file path
        if (!(url.startsWith('#') || url.startsWith('http'))) {
          useService('app').openFile(decodeURIComponent(url))
          return
        }

        // handle: only anchor `#anchor`
        // handle: http url
        return fn(url, param1)
      }))
  }
}
