import './index.scss'
import { Tab, TabContainer } from 'src/ui/components/tabs'
import { WorkspaceParent } from "../workspace-parent"
import type { WorkspaceLeaf } from '../workspace-leaf'
import { createEmptyLeaf } from '../workspace-utils'
import { WorkspaceNode } from '../workspace-node'


export class WorkspaceTabs extends WorkspaceParent {

  type = 'tabs'

  private tabHeader = new TabContainer({
    className: 'typ-workspace-tab-header',
    onToggle: (tabId, tabEl) => this.toggleTab(tabId, tabEl),
    onClose: (tabId, tabEl) => this.removeTab(tabId, tabEl),
  })

  tabContentEl: HTMLElement

  constructor() {
    super()

    $(this.containerEl)
      .addClass('typ-workspace-tabs')
      .append(this.tabHeader.containerEl)
      .append(this.tabContentEl = $('<div class="typ-workspace-tab-content">')[0])
  }

  insertChild(index: number, child: WorkspaceLeaf) {
    this.tabHeader.addTab(new Tab({
      id: child.state.path,
      text: child.state.title,
    }))
    super.insertChild(index, child)
  }

  _insertChildEl(index: number, child: WorkspaceLeaf) {
    this.tabContentEl.querySelector('.mod-active')?.classList.remove('mod-active')
    child.containerEl.classList.add('mod-active')
    this.tabContentEl.insertBefore(child.containerEl, this.tabContentEl.children[index])
  }

  removeChild(child: WorkspaceNode): void {
    this.removeTab((child as WorkspaceLeaf).state.path)
  }

  // --------- Tab Operators ---------

  get activedLeaf() {
    const path = $(this.tabHeader.containerEl).find('.typ-tab.active').data('id')
    const leaf = (this.children as WorkspaceLeaf[]).find(c => c.state.path === path)
    return leaf
  }

  addTabClass(path: string, className: string) {
    findTabEl(this.containerEl, path)?.classList.add(className)
  }

  removeTabClass(path: string, className: string) {
    findTabEl(this.containerEl, path)?.classList.remove(className)
  }

  toggleTab(path: string, tabEl?: HTMLElement): void {
    tabEl ??= findTabEl(this.containerEl, path)

    this.activedLeaf.view.close()
    this.tabContentEl.querySelector('.mod-active')?.classList.remove('mod-active')

    this.tabHeader.activeTab(tabEl)

    const leaf = (this.children as WorkspaceLeaf[]).find(c => c.state.path === path)
    leaf.containerEl.classList.add('mod-active')
    leaf.view.open()
  }

  removeTab(path: string, tabEl?: HTMLElement): void {
    tabEl ??= findTabEl(this.containerEl, path)

    this.tabHeader.closeTab(tabEl)

    const leaf = (this.children as WorkspaceLeaf[]).find(c => c.state.path === path)
    leaf.view.close()
    super.removeChild(leaf)

    if (!this.children.length) {
      if (this.getRoot() !== this.parent || this.parent.children.length > 1) {
        this.parent.removeChild(this)
      }
      else {
        this.appendChild(createEmptyLeaf())
      }
    }
  }
}

function findTabEl(el: HTMLElement, path: string) {
  return $(`.typ-tab[data-id="${path.replace(/\\/g, '\\\\')}"]`, el)[0]
}
