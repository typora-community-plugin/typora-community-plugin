import './index.scss'
import { Tab, TabContainer } from 'src/ui/components/tabs'
import { WorkspaceParent } from "../workspace-parent"
import type { WorkspaceLeaf } from '../workspace-leaf'
import { createEmptyLeaf } from '../workspace-utils'


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

  // --------- Tab Operators ---------

  toggleTab(path: string, tabEl: HTMLElement): void {
    this.tabHeader.activeTab(tabEl)
    this.tabContentEl.querySelector('.mod-active')?.classList.remove('mod-active')

    const leaf = (this.children as WorkspaceLeaf[]).find(c => c.state.path === path)
    leaf.containerEl.classList.add('mod-active')
  }

  removeTab(path: string, tabEl: HTMLElement): void {
    this.tabHeader.closeTab(tabEl)

    const leaf = (this.children as WorkspaceLeaf[]).find(c => c.state.path === path)
    this.removeChild(leaf)

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
