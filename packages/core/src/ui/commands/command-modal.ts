import './command-modal.scss'
import { useService } from 'src/common/service'
import { Component } from 'src/common/component'
import { openQuickPick } from '../components/quick-open'


export class CommandModal extends Component {

  constructor(
    private i18n = useService('i18n'),
    private commandsMgr = useService('command-manager'),
  ) {
    super()
  }

  onload() {
    const t = this.i18n.t.commandModal

    this.register(
      this.commandsMgr.register({
        id: 'command:open',
        title: t.commandOpen,
        scope: 'global',
        hotkey: 'F1',
        showInCommandPanel: false,
        callback: () => {
          const commands = Object.values(this.commandsMgr.commandMap)
            .filter(c => c.showInCommandPanel)
            .map(c => ({
              id: c.id,
              label: c.title,
            }))
          openQuickPick(commands, { placeholder: t.placeholder })
            .then(cmd => cmd && this.commandsMgr.run(cmd.id))
        }
      }))
  }
}
