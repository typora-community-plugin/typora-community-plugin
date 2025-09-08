import './empty-view.scss'
import { useService } from 'src/common/service'
import type { WorkspaceLeaf } from '../layout/workspace-leaf'
import { WorkspaceView } from '../layout/workspace-view'
import { html } from 'src/utils'


export class EmptyView extends WorkspaceView {

  static type = 'core.empty'

  containerEl = html`<div></div>`

  constructor(leaf: WorkspaceLeaf, private settings = useService('settings')) {
    super(leaf)
  }

  onload() {
    if (this.settings.get('useBlankNewTab')) return

    $(this.containerEl)
      .addClass('typ-empty-view')
      .append(html`<div><div class="typ-empty-title"></div><div class="typ-empty-hotkey"></div></div>`)

    setTimeout(() => {
      const config = useService('config-repository')
      const commands = useService('command-manager')
      const { t } = useService('i18n')

      const getHotky = (id: string) => commands.commandMap[id].hotkey
        ?.split('+')
        .map(k => `<kbd>${k}</kbd>`)
        .join('+') ?? ''

      $(this.containerEl)
        .find('.typ-empty-title')
        .text(t.views.empty.noFile)
        .end()
        .find('.typ-empty-hotkey')
        .append(html`<dl><dt>${t.commandModal.commandOpen}</dt><dd>${getHotky('command:open')}</dd></dl>`)
        .append(html`<dl><dt>${t.ribbon.settingOfApp}</dt><dd><kbd>Ctrl</kbd>+<kbd>,</kbd></dd></dl>`)
        .append(html`<dl><dt>${config.isUsingGlobalConfig
          ? t.ribbon.globalSettingOfPlugin
          : t.ribbon.vaultSettingOfPlugin}</dt><dd>${getHotky('settings:open')}</dd></dl>`)
    })
  }
}
