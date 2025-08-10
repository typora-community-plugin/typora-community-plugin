import './empty-view.scss'
import { useService } from 'src/common/service'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { WorkspaceView } from '../layout/workspace-view'
import { html } from 'src/utils'


export class EmptyView extends WorkspaceView {

  constructor(leaf: WorkspaceLeaf) {
    super(leaf)

    this.containerEl = $(`<div class="typ-empty-view"><div><div class="typ-empty-title">No file is open.</div><div class="typ-empty-hotkey"></div></div></div>`)[0]

    setTimeout(() => {
      const commands = useService('command-manager')

      const getHotky = (id: string) => commands.commandMap[id].hotkey
        ?.split('+')
        .map(k => `<kbd>${k}</kbd>`)
        .join('+') ?? ''

      $(this.containerEl)
        .find('.typ-empty-hotkey')
        .append(html`<dl><dt>Open Command Modal</dt><dd>${getHotky('command:open')}</dd></dl>`)
        .append(html`<dl><dt>Open App Settings</dt><dd><kbd>Ctrl</kbd>+<kbd>,</kbd></dd></dl>`)
        .append(html`<dl><dt>Open Plugin Settings</dt><dd>${getHotky('settings:open')}</dd></dl>`)
    })
  }
}
