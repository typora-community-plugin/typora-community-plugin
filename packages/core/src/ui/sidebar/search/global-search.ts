import { GlobalSearchView } from "./global-search-view"
import { useService } from "src/common/service"


export class GlobalSearch {

  constructor(
    private workspace = useService('workspace'),
  ) {
  }

  openGlobalSearch(query: string) {
    const { workspace } = this
    workspace.ribbon.clickButton(GlobalSearchView.id)

    const view = workspace.getViewByType(GlobalSearchView)
    view.setQuery(query)
    view.startSearch()
  }

  getGlobalSearchQuery() {
    const view = this.workspace.getViewByType(GlobalSearchView)
    return view.getQuery()
  }
}
