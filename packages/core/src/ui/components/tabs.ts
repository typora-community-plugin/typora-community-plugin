import './tabs.scss'
import { html } from "src/utils"
import { View } from "src/ui/common/view"
import { draggable } from "./draggable"


interface TabContainerProps {
  className?: string
  onToggle: (tabId: string) => void
  onClose: (tabId: string) => void
}

export class TabContainer extends View {

  container: HTMLElement

  constructor(private props: TabContainerProps) {
    super()

    this.containerEl = html`<div class="typ-tabs-wrapper ${props.className}"></div>`
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
  text: string | (() => HTMLElement | JQuery<HTMLElement>)
  title?: string
}

export class Tab extends View {
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
