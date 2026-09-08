import './expandable-section.scss'
import { Notice } from 'src/ui/components/notice'
import type { MarkdownRenderer } from 'src/ui/editor/markdown-renderer'
import type { SettingItem } from 'src/ui/settings/setting-item'
import { html } from 'src/utils'


export interface ExpandableSectionOptions {
  iconClass: string
  title: string
  labelView: string
  labelCollapse: string
  labelLoading: string
  /** Shown via `Notice.error()` when the content is missing (e.g. not found). */
  labelNotFound?: string
  fetchContent: () => Promise<string | undefined>
  mdRenderer: MarkdownRenderer
}


export class ExpandableSection {

  private _wrapperEl: HTMLElement | undefined
  private _panelEl: HTMLElement | undefined
  private readonly _options: ExpandableSectionOptions

  constructor(options: ExpandableSectionOptions) {
    this._options = options
  }

  /**
   * Create a toggle button (placed into the setting item's controls) that lazily fetches markdown content and renders it into a collapsible section under the given setting item.
   */
  addButtonTo(setting: SettingItem) {
    const { iconClass, title, labelView, labelCollapse, labelLoading, labelNotFound } = this._options

    setting.addButton(button => {
      button.title = title
      button.innerHTML = `<span class="fa ${iconClass}"></span> ${labelView}`

      const resetButton = () => {
        button.disabled = false
        button.innerHTML = `<span class="fa ${iconClass}"></span> ${labelView}`
      }

      const setToggleLabel = () => {
        button.innerHTML = `<span class="fa ${iconClass}"></span> ${this._panelEl?.classList.contains('collapsed') ? labelView : labelCollapse}`
      }

      button.onclick = async () => {
        if (this._wrapperEl && this._panelEl) {
          this._panelEl.classList.toggle('collapsed')
          setToggleLabel()
          return
        }

        button.disabled = true
        button.innerHTML = `<span class="fa fa-spinner fa-spin"></span> ${labelLoading}`

        try {
          const md = await this._options.fetchContent()
          if (!md || !button.isConnected) {
            if (button.isConnected && md === undefined) Notice.error(labelNotFound ?? '')
            resetButton()
            return
          }

          const contentEl = html`<div class="typ-expandable-content"></div>`
          this._panelEl = html`<div class="typ-expandable-panel collapsed"></div>`
          this._wrapperEl = html`<div class="typ-expandable-section"></div>`
          this._panelEl.append(contentEl)
          this._wrapperEl.append(this._panelEl)
          setting.containerEl.append(this._wrapperEl)

          this._options.mdRenderer.renderTo(md, contentEl)
          button.disabled = false
          requestAnimationFrame(() => {
            this._panelEl!.classList.remove('collapsed')
            setToggleLabel()
          })
        } catch {
          resetButton()
        }
      }
    })
  }
}
