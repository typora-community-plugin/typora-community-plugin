import './index.scss'
import { WorkspaceParent } from "../workspace-parent"
import type { WorkspaceLeaf } from '../workspace-leaf'
import { createEmptyLeaf } from '../workspace-utils'
import { WorkspaceNode } from '../workspace-node'
import { FileTab, FileTabContainer } from './file-tabs'
import { useActiveLeaf } from '../use-active-leaf'
import { EmptyView } from 'src/ui/views/empty-view'


export class WorkspaceTabs extends WorkspaceParent {

  type = 'tabs'

  tabHeader = new FileTabContainer({
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
    this.tabHeader.insertTab(index, new FileTab(child.state.path))
    super.insertChild(index, child)
    this.toggleTab(child.state.path)

    if (
      this.children.length === 2 &&
      (this.children[0] as WorkspaceLeaf).state.path.startsWith(`typ://${EmptyView.type}`)
    ) {
      this.removeChild(this.children[0])
    }
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

  private _activeLeaf: WorkspaceLeaf

  get activedLeaf() {
    return this._activeLeaf ?? this.children[0] as WorkspaceLeaf
  }

  toggleTab(path: string, tabEl?: HTMLElement): void {
    this.activedLeaf.view.close()
    this.tabContentEl.querySelector('.mod-active')?.classList.remove('mod-active')

    tabEl ??= this.tabHeader.getTabById(path)
    this.tabHeader.activeTab(tabEl)

    const [, setActiveLeaf] = useActiveLeaf()
    const leaf = (this.children as WorkspaceLeaf[]).find(c => c.state.path === path)
    leaf.containerEl.classList.add('mod-active')
    leaf.view.open()

    this._activeLeaf = leaf
    setActiveLeaf(leaf)
  }

  renameTab(oldPath: string, newPath: string): void {
    const tabEl = this.tabHeader.getTabById(oldPath)
    const newTab = new FileTab(newPath)
    this.tabHeader.renameTab(tabEl, newTab)

    const leaf = (this.children as WorkspaceLeaf[]).find(c => c.state.path === oldPath)
    leaf.state.path = newPath
    leaf.view.setIcon(leaf.view.icon)
  }

  removeTab(path: string, tabEl?: HTMLElement): void {
    tabEl ??= this.tabHeader.getTabById(path)
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

  removeOthers(path: string) {
    this.toggleTab(path)
    this.tabHeader.closeOtherTabs(this.tabHeader.getTabById(path))
  }

  removeRight(path: string) {
    this.toggleTab(path)
    this.tabHeader.closeRightTabs(this.tabHeader.getTabById(path))
  }
}
