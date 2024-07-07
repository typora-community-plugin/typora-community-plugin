import type { App } from "src/app"
import { GlobalSearchView } from "./global-search-view"


export class GlobalSearch {

  constructor(private app: App) {
  }

  openGlobalSearch(query: string) {
    const { workspace } = this.app
    workspace.ribbon.clickButton(GlobalSearchView.id)

    const view = workspace.getViewByType(GlobalSearchView)
    view.setQuery(query)
    view.startSearch()
  }

  getGlobalSearchQuery() {
    const view = this.app.workspace.getViewByType(GlobalSearchView)
    return view.getQuery()
  }
}
