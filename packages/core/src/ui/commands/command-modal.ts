import './command-modal.scss'
import { Modal } from "../components/modal"
import type { Command } from 'src/command/command-manager'
import { html } from 'src/utils/html'
import { useService } from 'src/common/service'


export class CommandModal extends Modal {

  private input: HTMLInputElement
  private results: HTMLElement

  private commands: Command[]
  private filteredCommands: Command[]
  private selected = -1

  constructor(
    private i18n = useService('i18n'),
    private commandsMgr = useService('command-manager'),
    private markdownEditor = useService('markdown-editor'),
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
          this.updateCommands(
            Object.values(this.commandsMgr.commandMap)
          )
          this.show()
        }
      }))

    super.onload()

    this.modal.classList.add('typ-command-modal')

    this.addBody(body => {
      $(body)
        .on('keyup', this.onKeyup as any)
        .append(
          $('<div class="typ-command-modal__form"></div>')
            .append(this.input =
              html`<input type="text" placeholder="${t.placeholder}" />` as any)
        )
        .append(this.results =
          $('<div class="typ-command-modal__results stopselect"></div>')
            .on('click', this.onItemClick as any)
            .get(0)
        )
    })
  }

  private onKeyup = (event: KeyboardEvent) => {
    let { key } = event;
    if (key.startsWith("Arrow")) {
      if (key === "ArrowDown") {
        if (this.selected < this.filteredCommands.length - 1) {
          this.selected++
        } else {
          this.selected = 0
        }
      } else if (key === "ArrowUp") {
        if (this.selected > 0) {
          this.selected--
        } else {
          this.selected = this.filteredCommands.length - 1
        }
      }
      this.renderCommands()
      return
    }
    if (key === "Enter") {
      this.onSelect(this.filteredCommands[this.selected].id)
      return
    }
    this.selected = -1
    this.filteredCommands = this.commands.filter((c) =>
      c.title.toLowerCase().includes(this.input.value.toLowerCase())
    )
    this.renderCommands()
  }

  private onItemClick = (event: MouseEvent) => {
    const el = event.target as HTMLElement
    const item = el.closest(".typ-command-modal__item") as HTMLElement
    if (!item) return

    this.onSelect(item.dataset.id!)
  }

  private onSelect = (id: string) => {
    this.hide()
    this.commandsMgr.run(id)
  }

  show() {
    super.show()
    this.markdownEditor.selection.save()
    this.input.focus()
  }

  hide() {
    super.hide()
    this.input.value = ""
    this.selected = -1
    this.markdownEditor.selection.restore()
  }

  private updateCommands(commands: Command[]) {
    this.commands = this.filteredCommands = commands.filter(
      c => c.showInCommandPanel
    )
    this.renderCommands()
  }

  private renderCommands() {
    this.results.innerHTML = ''
    this.results.append(...this.filteredCommands.map((cmd, i) => {
      const active = (i === this.selected) ? 'active' : ''
      return html`<div class="typ-command-modal__item ${active}" data-id=${cmd.id}>${cmd.title}</div>`
    }))
  }
}
