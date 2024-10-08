import './tabs-view.scss'
import path from 'src/path'
import { editor } from "typora"
import decorate from "@plylrnsdy/decorate.js"
import { Component } from 'src/common/component'
import { useService } from 'src/common/service'
import { useEventBus } from 'src/common/eventbus'
import { Menu } from 'src/ui/components/menu'
import { Tab, TabContainer } from 'src/ui/components/tabs'
import { truncate } from 'src/utils'


const MAX_LENGHT = { length: 20, omission: '…' }

export class TabsView extends Component {

  private container: FileTabContainer

  private tabs: Map<string, HTMLElement> = new Map()

  private tabPos: Map<string, number> = new Map()

  constructor(
    private settings = useService('settings'),
    private i18n = useService('i18n'),
    private vault = useService('vault'),
    private workspace = useEventBus('workspace'),
  ) {
    super()

    settings.onChange('showFileTabs', (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  load() {
    if (!this.settings.get('showFileTabs')) {
      return
    }
    super.load()
  }

  onload() {
    this.container ??= new FileTabContainer({
      className: 'typ-file-tabs',
      onToggle: (tabId) => this.toggleTab(tabId),
      onClose: (tabId) => this.removeTab(tabId),
    })

    this._setupContextMenu()

    const editorContainer = document.querySelector('content')!
    editorContainer.append(this.container.containerEl)

    document.body.classList.add('typ-file-tabs--enable')

    this.register(
      this.workspace.on('file:will-open', () => {
        this.tabPos.set(
          useService('workspace').activeFile,
          editorContainer.scrollTop
        )
      }))

    this.register(
      this.workspace.on('file:open', (file) => {
        this.addTab(file)
        if (!this.tabPos.get(file)) return
        setTimeout(() => editorContainer.scrollTop = this.tabPos.get(file), 100)
      }))

    this.register(
      this.vault.on('file:delete', this.removeTab.bind(this)))

    this.register(
      this.vault.on('file:rename', this.renameTab.bind(this)))

    this.register(
      this.vault.on('directory:rename', (oldDirPath, newDirPath) => {
        Array.from(this.tabs.keys())
          .filter(path => path.startsWith(oldDirPath))
          .forEach(path => {
            const newFilePath = newDirPath + path.slice(oldDirPath.length)
            this.renameTab(path, newFilePath)
          })
      }))

    // fix anchor jumping offset
    this.register(
      decorate.parameters(editor.selection, 'scrollAdjust', ([$el, offset, p2, p3]) => {
        if ($el && offset) offset += 28
        return [$el, offset, p2, p3]
      })
    )

    this.container.hideTabExtension(this.settings.get('hideExtensionInFileTab'))
    this.register(
      this.settings.onChange('hideExtensionInFileTab', (_, isHide) => {
        this.container.hideTabExtension(isHide)
      })
    )
  }

  onunload() {
    document.body.classList.remove('typ-file-tabs--enable')
    this.container.containerEl.remove()
  }

  private _setupContextMenu() {
    const { t } = this.i18n

    const menu = new Menu()

    this.registerDomEvent(this.container.containerEl, 'contextmenu', (event: MouseEvent) => {
      const tabEl = $(event.target).closest('.typ-tab')
      const clickedTabPath = tabEl.data('id')

      menu.empty()

      if (this.tabs.size > 1) {
        menu.addItem(item => {
          item
            .setKey('removeTab')
            .setTitle(t.tabview.close)
            .onClick(() => this.removeTab(clickedTabPath))
        })
      }

      menu
        .addItem(item => {
          item
            .setKey('removeOthers')
            .setTitle(t.tabview.closeOthers)
            .onClick(() => this.removeOthers(clickedTabPath))
        })
        .addItem(item => {
          item
            .setKey('removeRight')
            .setTitle(t.tabview.closeRight)
            .onClick(() => this.removeRight(clickedTabPath))
        })
        .showAtMouseEvent(event)
    })
  }

  addTab(filePath: string) {
    if (this.tabs.has(filePath)) {
      this.container.activeTab(this.tabs.get(filePath))
      return
    }

    const tab = new FileTab(filePath)
    this.container.addTab(tab)
    this.tabs.set(filePath, tab.containerEl)
  }

  toggleTab(filePath: string) {
    editor.library.openFile(filePath)
  }

  renameTab(oldPath: string, newPath: string) {
    if (!this.tabs.has(oldPath)) return

    const tab = this.tabs.get(oldPath)!
    const newTab = new FileTab(newPath)
    this.container.renameTab(tab, newTab)
    this.tabs.delete(oldPath)
    this.tabs.set(newPath, newTab.containerEl)
  }

  removeTab(path: string) {
    if (!this.tabs.has(path)) return
    const tab = this.tabs.get(path)!
    this.container.closeTab(tab)
    tab.remove()
    this.tabs.delete(path)
  }

  removeOthers(path: string) {
    editor.library.openFile(path)
    this.container.closeOtherTabs(this.tabs.get(path)!)
  }

  removeRight(path: string) {
    editor.library.openFile(path)
    this.container.closeRightTabs(this.tabs.get(path)!)
  }
}

class FileTabContainer extends TabContainer {

  hideTabExtension(isHide: boolean) {
    $('.typ-file-tabs').toggleClass('typ-file-ext--hide', isHide)
  }
}

class FileTab extends Tab {
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
