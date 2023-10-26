import './tabs-view.scss'
import * as path from 'path'
import { editor } from "typora"
import decorate from "@plylrnsdy/decorate.js"
import type { App } from "src/app"
import { draggable } from 'src/components/draggable'
import { Menu } from 'src/components/menu'
import fs from 'src/fs/filesystem'
import { View } from "src/ui/view"


export class TabsView extends View {

  private tabs: Map<string, HTMLElement> = new Map()

  private tabPos: Map<string, number> = new Map()

  constructor(private app: App) {
    super()

    this.app.settings.onChange('showFileTabs', (_, isEnabled) => {
      isEnabled ? this.load() : this.unload()
    })
  }

  load() {
    if (!this.app.settings.get('showFileTabs')) {
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
      this.app.workspace.on('file:will-open', () => {
        this.tabPos.set(this.app.workspace.activeFile, editorContainer.scrollTop)
      }))

    this.register(
      this.app.workspace.on('file:open', (file) => {
        this.addTab(file)
        if (!this.tabPos.get(file)) return
        setTimeout(() => editorContainer.scrollTop = this.tabPos.get(file), 100)
      }))

    this.register(
      this.app.vault.on('file:delete', this.removeTab.bind(this)))

    this.register(
      this.app.vault.on('file:rename', this.renameTab.bind(this)))

    this.register(
      this.app.vault.on('directory:rename', (oldDirPath, newDirPath) => {
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
  }

  onunload() {
    document.body.classList.remove('typ-tabs--enable')
    this.containerEl.remove()
  }

  private _buildContainer() {
    const el = document.createElement('div')
    el.classList.add('typ-tabs-wrapper')
    el.innerHTML = '<div class="typ-tabs"></div>'

    // handle: click
    el.addEventListener('click', event => {
      const clickedEl = event.target as HTMLElement
      if (clickedEl.classList.contains('typ-tab')) {
        const tab = clickedEl
        if (tab.classList.contains('active')) return

        const filePath = tab.dataset.path!

        fs.exists(filePath)
          .then(isExists => !isExists && this.removeTab(filePath))

        this.containerEl.querySelectorAll('.typ-tab')
          .forEach(el => el.classList.remove('active'))

        tab.classList.add('active')

        editor.library.openFile(filePath)
      }
      else if (clickedEl.classList.contains('typ-close')) {
        const tab = clickedEl.parentElement!
        this.removeTab(tab.dataset.path!)
      }
    })

    // handle: draggable
    draggable(el, 'x')

    // handle: scroll
    el.addEventListener('wheel', event => {
      event.preventDefault()
      const el = event.target as HTMLElement
      let tabs
      if (tabs = el.closest('.typ-tabs-wrapper')) {
        tabs.scrollLeft += event.deltaY
      }
    })

    return el
  }

  private _setupContextMenu() {
    const { t } = this.app.i18n
    const menu = new Menu()

    this.registerDomEvent(this.containerEl, 'contextmenu', (event: MouseEvent) => {
      const clickedTabPath = $(event.target).data('path')
      const activeTabPath = $('.typ-tab.active', this.containerEl).data('path')

      menu.empty()

      if (clickedTabPath !== activeTabPath) {
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

    this.addChild(menu)
  }

  addTab(filePath: string) {
    if (this.tabs.has(filePath)) {
      this.containerEl.querySelectorAll('.typ-tab')
        .forEach(el => el.classList.remove('active'))
      this.tabs.get(filePath)!.classList.add('active')
      return
    }

    const displayPath = path.relative(this.app.vault.path, filePath)
      .replace(/(?<=\.textbundle)[\\/]text\.(?:md|markdown)$/, '')

    const tab = $(`<div class="typ-tab active" data-path="${filePath}" title="${displayPath}" draggable="true">${path.basename(displayPath)}<i class="typ-icon typ-close"></i></div>`)
      .get(0)!

    this.containerEl.querySelectorAll('.typ-tab')
      .forEach(el => el.classList.remove('active'))
    this.containerEl.children[0]!.append(tab)

    this.tabs.set(filePath, tab)

    this.showCurrentTab(tab)
  }

  showCurrentTab(tabEl: HTMLElement) {
    tabEl.parentElement!.parentElement!.scrollLeft = tabEl.offsetLeft
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
}
