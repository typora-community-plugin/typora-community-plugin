import './tabs-view.scss'
import path from 'src/path'
import { editor } from "typora"
import decorate from "@plylrnsdy/decorate.js"
import { useService } from 'src/common/service'
import { useEventBus } from 'src/common/eventbus'
import { draggable } from 'src/ui/components/draggable'
import { Menu } from 'src/ui/components/menu'
import { html, truncate } from 'src/utils'
import { Component } from 'src/common/component'
import { View } from '../common/view'


const MAX_LENGHT = { length: 20, omission: '…' }

export class TabsView extends Component {

  private container: TabContainer

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
    this.container ??= new TabContainer({
      onToggle: (tabId) => this.toggleTab(tabId),
      onClose: (tabId) => this.removeTab(tabId),
    })

    this._setupContextMenu()

    const editorContainer = document.querySelector('content')!
    editorContainer.append(this.container.containerEl)

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

    this.container.hideTabExtension(this.settings.get('hideExtensionInFileTab'))
    this.register(
      this.settings.onChange('hideExtensionInFileTab', (_, isHide) => {
        this.container.hideTabExtension(isHide)
      })
    )
  }

  onunload() {
    document.body.classList.remove('typ-tabs--enable')
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
            .onClick(() => this.container.closeTab(tabEl[0]))
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
    this.container.renameTab(tab, new FileTab(newPath))
    this.tabs.delete(oldPath)
    this.tabs.set(newPath, tab)
  }

  removeTab(path: string) {
    this.tabs.get(path)?.remove()
    this.tabs.delete(path)
  }

  removeOthers(path: string) {
    editor.library.openFile(path)
    for (const [p, el] of this.tabs.entries()) {
      p !== path && this.container.closeTab(el)
    }
  }

  removeRight(path: string) {
    editor.library.openFile(path)
    this.container.closeRightTabs(this.tabs.get(path)!)
  }
}

interface TabContainerProps {
  onToggle: (tabId: string) => void
  onClose: (tabId: string) => void
}

class TabContainer extends View {

  container: HTMLElement

  constructor(private props: TabContainerProps) {
    super()

    this.containerEl = html`<div class="typ-tabs-wrapper"></div>`
    this.containerEl.append(this.container =
      $('<div class="typ-tabs"></div>')
        // handle: left click
        .on('click', event => {
          const $clickedEl = $(event.target)
          const $tab = $clickedEl.closest('.typ-tab')
          if ($clickedEl.hasClass('typ-close')) {
            this.closeTab($tab.get(0))
          }
          else {
            if ($tab.hasClass('active')) return
            this.toggleTab($tab.get(0))
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
    )

    // handle: draggable
    draggable(this.containerEl, 'x')
  }

  showTab(tabEl: HTMLElement) {
    tabEl.parentElement!.parentElement!.scrollLeft = tabEl.offsetLeft
  }

  addTab(tab: Tab) {
    this.activeTab(tab.containerEl)
    this.container.append(tab.containerEl)
    this.showTab(tab.containerEl)
  }

  renameTab(tabEl: HTMLElement, tab: Tab) {
    tabEl.replaceWith(tab.containerEl)
  }

  hideTabExtension(isHide: boolean) {
    $('.typ-tabs-wrapper').toggleClass('typ-hide-ext', isHide)
  }

  activeTab(tabEl: HTMLElement) {
    this.container.querySelectorAll('.typ-tab')
      .forEach(el => el.classList.remove('active'))

    tabEl.classList.add('active')
  }

  toggleTab(tabEl: HTMLElement) {
    const tabId = tabEl.dataset.id!

    this.container.querySelectorAll('.typ-tab')
      .forEach(el => el.classList.remove('active'))

    tabEl.classList.add('active')

    this.props.onToggle(tabId)
  }

  closeTab(tabEl: HTMLElement) {
    if (tabEl.classList.contains('active')) {
      const siblingTab = this.getSiblingTab(tabEl)
      this.toggleTab(siblingTab)
    }

    const tabId = tabEl.dataset.id!
    this.props.onClose(tabId)
  }

  closeRightTabs(tabEl: HTMLElement) {
    const tabEls = Array.from(this.container.children) as HTMLElement[]
    const currentIdx = tabEls.findIndex(el => el.dataset.id === tabEl.dataset.id!)
    const rightTabEls = tabEls.slice(currentIdx).slice(1)
    rightTabEls.forEach(el => this.closeTab(el))
  }

  getSiblingTab(tabEl: HTMLElement) {
    return (tabEl.previousElementSibling
      ?? tabEl.nextElementSibling) as HTMLElement
  }
}

interface TabProps {
  id: string
  text: string | (() => HTMLElement)
  title?: string
}

class Tab extends View {
  constructor(props: TabProps) {
    super()

    this.containerEl = $(`<div class="typ-tab" data-id="${props.id}" draggable="true"></div>`)
      .attr('title', props.title || '')
      .append(typeof props.text === 'function'
        ? props.text()
        : props.text
      )
      .append(html`<i class="typ-icon typ-close"></i>`)
      .get(0)
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
      text: () => html`<span>${shortName}</span><span class="typ-file-ext">${ext}</span>`,
      title: longPath,
    })
  }
}
