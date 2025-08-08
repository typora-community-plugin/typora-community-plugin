import { useService } from "src/common/service"
import { Menu } from "src/ui/components/menu"
import type { WorkspaceRoot } from "../workspace-root"
import type { WorkspaceTabs } from "."


export function onTabsContextMenu(root: WorkspaceRoot, i18n = useService('i18n')) {

  const { t } = i18n

  const menu = new Menu()

  return function (event: MouseEvent) {
    const $tabEl = $(event.target).closest('.typ-tab')
    const clickedTabPath = $tabEl.data('id')
    const tabsEl = $tabEl.closest('.typ-workspace-tabs')[0]
    const tabs = root.findNode(n => n.containerEl === tabsEl) as WorkspaceTabs

    menu.empty()

    if (tabs.children.length > 1) {
      menu.addItem(item => {
        item
          .setKey('removeTab')
          .setTitle(t.tabview.close)
          .onClick(() => tabs.removeTab(clickedTabPath))
      })
    }

    menu
      .addItem(item => {
        item
          .setKey('removeOthers')
          .setTitle(t.tabview.closeOthers)
          .onClick(() => tabs.removeOthers(clickedTabPath))
      })
      .addItem(item => {
        item
          .setKey('removeRight')
          .setTitle(t.tabview.closeRight)
          .onClick(() => tabs.removeRight(clickedTabPath))
      })
      .showAtMouseEvent(event)
  }
}
