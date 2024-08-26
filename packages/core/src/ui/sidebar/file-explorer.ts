import './file-explorer.scss'
import decorate from "@plylrnsdy/decorate.js"
import { editor, File } from "typora"
import { Component } from 'src/common/component'
import path from 'src/path'
import { View } from 'src/ui/view'
import { BUILT_IN } from "src/ui/ribbon/workspace-ribbon"
import { html } from "src/utils"
import { useService } from "src/common/service"


export class FileExplorer extends View {

  static get id() {
    return 'core.file-explorer' as const
  }

  private _showNotSupportedFile = new ShowNotSupportedFile()

  constructor(
    i18n = useService('i18n'),
    private ribbon = useService('ribbon'),
    private sidebar = useService('sidebar'),
  ) {
    super()

    this.containerEl = document.getElementById('file-library') as HTMLElement

    ribbon.addButton({
      [BUILT_IN]: true,
      id: FileExplorer.id,
      title: i18n.t.ribbon.files,
      icon: html`<i class="fa fa-folder-o"></i>`,
      onclick: () => this.sidebar.switch(FileExplorer),
    })
  }

  onload() {
    this.ribbon.activeButton(FileExplorer.id)
  }

  show() {
    editor.library.fileSearch.hide()
    editor.library.switch("", true)
  }

  hide() {
    this.sidebar.wrapperEl.classList.remove('active-tab-files')
  }
}

class ShowNotSupportedFile extends Component {

  constructor(
    settings = useService('settings'),
  ) {
    super()

    const SETTING_KEY = 'showNotSupportedFile'

    if (settings.get(SETTING_KEY)) {
      this.load()
    }

    settings.onChange(SETTING_KEY, (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  onload() {
    File.SupportedFiles.indexOf = () => 1
    $(document)
      .on('drop', () => {
        delete File.SupportedFiles.indexOf
      })
      .on('mouseup', () => {
        File.SupportedFiles.indexOf = () => 1
      })

    this.register(
      decorate(editor.library, 'openFile', fn => (file, callback) => {
        const ext = path.extname(file).slice(1)
        if (ext && !File.SupportedFiles.includes(ext)) {
          useService('app').openFileWithDefaultApp(file)
          return
        }
        fn(file, callback)
      }))
  }

  onunload() {
    delete File.SupportedFiles.indexOf
  }
}
