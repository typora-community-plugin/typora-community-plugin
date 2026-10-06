import './command-modal.scss'
import { useService } from 'src/common/service'
import { Component } from 'src/common/component'
import { openQuickPick, QuickPickItemKind, type QuickPickItem } from '../components/quick-open'


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

          const recentIds = this.commandsMgr.getRecentCommandIds()
          const recentCommands = recentIds
            .map(id => commands.find(c => c.id === id)!)
            .filter(c => !!c && c.showInCommandPanel)
          const otherCommands = commands.filter(c => !recentIds.includes(c.id))

          const items: ({ id?: string } & QuickPickItem)[] = [
            ...(recentCommands.length
              ? [{ label: t.recentlyUsed, kind: QuickPickItemKind.Separator }]
              : []),
            ...recentCommands.map(c => ({ id: c.id, label: c.title })),
            ...(otherCommands.length
              ? [{ label: t.otherCommands, kind: QuickPickItemKind.Separator }]
              : []),
            ...otherCommands.map(c => ({ id: c.id, label: c.title })),
          ]
          openQuickPick(items, { placeholder: t.placeholder })
            .then(cmd => {
              if (!cmd?.id) return
              this.commandsMgr.run(cmd.id)
              this.commandsMgr.addToRecent(cmd.id)
            })
        }
      }))
  }
}
