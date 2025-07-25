import { uniqueId } from "src/utils"
import { View } from "../common/view"


export class EmptyView extends View {

  containerEl = $(`<div class="typ-empty-view"><div>No file is open.</div><div>Empty ${uniqueId('View ')}</div></div>`)[0]

}
