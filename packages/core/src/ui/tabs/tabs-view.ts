import './tabs-view.scss'
import path from 'src/path'
import { editor } from "typora"
import decorate from "@plylrnsdy/decorate.js"
import { useService } from 'src/common/service'
import { useEventBus } from 'src/common/eventbus'
import { draggable } from 'src/components/draggable'
import { Menu } from 'src/components/menu'
import fs from 'src/io/fs/filesystem'
import { View } from "src/ui/view"
import { html } from 'src/utils/html'
import { truncate } from 'src/utils/string/truncate'


const MAX_LENGHT = { length: 20, omission: '…' }

export class TabsView extends View {

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
    this.containerEl ??= this._buildContainer()
    this._setupContextMenu()

    const editorContainer = document.querySelector('content')!
    editorContainer.append(this.containerEl)

    document.body.classList.add('typ-tabs--enable')

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

    this.hideTabExtension(this.settings.get('hideExtensionInFileTab'))
    this.register(
      this.settings.onChange('hideExtensionInFileTab', (_, isHide) => {
        this.hideTabExtension(isHide)
      })
    )
  }

  onunload() {
    document.body.classList.remove('typ-tabs--enable')
    this.containerEl.remove()
  }

  private _buildContainer() {
    const el = $('<div class="typ-tabs-wrapper"></div>')
      .append('<div class="typ-tabs"></div>')
      // handle: left click
      .on('click', event => {
        const $clickedEl = $(event.target)
        if ($clickedEl.is('.typ-tab, .typ-file-ext')) {
          const $tab = $clickedEl.closest('.typ-tab')
          if ($tab.hasClass('active')) return
          this.toggleTab($tab.get(0))
        }
        else if ($clickedEl.hasClass('typ-close')) {
          const tab = $clickedEl.parent().get(0)
          this.closeTab(tab)
        }
      })
      // handle: middle click
      .on('mousedown', event => {
        if (event.button !== 1) return

        const tab = event.target as HTMLElement
        this.closeTab(tab)
      })
      // handle: scroll
      .on('wheel', (event) => {
        event.preventDefault()
        const el = event.target as HTMLElement
        let tabs
        if (tabs = el.closest('.typ-tabs-wrapper')) {
          const evt = event.originalEvent as WheelEvent
          tabs.scrollLeft += evt.deltaY
        }
      })
      .get(0)

    // handle: draggable
    draggable(el, 'x')

    return el
  }

  private _setupContextMenu() {
    const { t } = this.i18n
    const menu = new Menu()

    this.registerDomEvent(this.containerEl, 'contextmenu', (event: MouseEvent) => {
      const tabEl = $(event.target).closest('.typ-tab')
      const clickedTabPath = tabEl.data('path')

      menu.empty()

      if (this.tabs.size > 1) {
        menu.addItem(item => {
          item
            .setKey('removeTab')
            .setTitle(t.tabview.close)
            .onClick(() => this.closeTab(tabEl[0]))
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

    this.addChild(menu)
  }

  addTab(filePath: string) {
    if (this.tabs.has(filePath)) {
      this.containerEl.querySelectorAll('.typ-tab')
        .forEach(el => el.classList.remove('active'))
      this.tabs.get(filePath)!.classList.add('active')
      return
    }

    const longPath = path.relative(this.vault.path, filePath)
      .replace(/(\.textbundle)[\\/]text\.(?:md|markdown)$/, '$1')
    const ext = path.extname(filePath)
    const shortName = truncate(path.basename(longPath, ext), MAX_LENGHT)

    const tab = html`<div class="typ-tab active" data-path="${filePath}" title="${longPath}" draggable="true">${shortName}<span class="typ-file-ext">${ext}</span><i class="typ-icon typ-close"></i></div>`

    this.containerEl.querySelectorAll('.typ-tab')
      .forEach(el => el.classList.remove('active'))
    this.containerEl.children[0]!.append(tab)

    this.tabs.set(filePath, tab)

    this.showTab(tab)
  }

  showTab(tabEl: HTMLElement) {
    tabEl.parentElement!.parentElement!.scrollLeft = tabEl.offsetLeft
  }

  async toggleTab(tabEl: HTMLElement) {
    const filePath = tabEl.dataset.path!
    const isExists = await fs.exists(filePath)

    if (isExists) {
      this.containerEl.querySelectorAll('.typ-tab')
        .forEach(el => el.classList.remove('active'))

      tabEl.classList.add('active')

      editor.library.openFile(filePath)
    }
    else {
      this.toggleTab(this.getSiblingTab(tabEl))
      this.removeTab(filePath)
    }
  }

  closeTab(tabEl: HTMLElement) {
    if (this.tabs.size <= 1) return

    if (tabEl.classList.contains('active')) {
      const siblingTab = this.getSiblingTab(tabEl)
      this.toggleTab(siblingTab)
    }

    this.removeTab(tabEl.dataset.path!)
  }

  getSiblingTab(tabEl: HTMLElement) {
    return (tabEl.previousElementSibling
      ?? tabEl.nextElementSibling) as HTMLElement
  }

  renameTab(oldPath: string, newPath: string) {
    if (!this.tabs.has(oldPath)) return
    const tab = this.tabs.get(oldPath)!
    tab.dataset.path = newPath
    tab.innerHTML = `${path.basename(newPath)}<i class="typ-icon typ-close"></i>`
    this.tabs.set(newPath, tab)
  }

  removeTab(path: string) {
    this.tabs.get(path)?.remove()
    this.tabs.delete(path)
  }

  removeOthers(path: string) {
    editor.library.openFile(path)
    for (const p of this.tabs.keys()) {
      p !== path && this.removeTab(p)
    }
  }

  removeRight(path: string) {
    editor.library.openFile(path)
    const tabEls = Array.from(this.containerEl.children[0].children) as HTMLElement[]
    const currentIdx = tabEls.findIndex(el => el.dataset.path === path)
    const rightTabEls = tabEls.slice(currentIdx).slice(1)
    rightTabEls.forEach(el => this.removeTab(el.dataset.path!))
  }

  hideTabExtension(isHide: boolean) {
    $('.typ-tabs-wrapper').toggleClass('typ-hide-ext', isHide)
  }
}
