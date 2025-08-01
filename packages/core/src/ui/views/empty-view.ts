import './empty-view.scss'
import { uniqueId } from "src/utils"
import { WorkspaceView } from '../layout/workspace-view'


export class EmptyView extends WorkspaceView {

  containerEl = $(`<div class="typ-empty-view"><div>No file is open.</div><div>Empty ${uniqueId('View ')}</div></div>`)[0]

}
