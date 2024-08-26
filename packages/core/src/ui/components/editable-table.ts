import './editable-table.scss'
import { View } from "../view"
import { html } from "src/utils"


type TableHeader<T extends object> = {
  title: string
  prop: keyof T
  type?: string
}

type RowHandler<T> = (row: T) => void

const removeRowCell = `<td><button class="typ-button" data-op="removeRow"><span class="fa fa-minus"></span></button></td>`

export class EditableTable<T extends Record<string, any>> extends View {

  private bodyEl: HTMLTableSectionElement
  private editingRowEl: HTMLTableRowElement | null

  private headers: TableHeader<T>[] = []
  private data: T[] = []
  private rowChangeHandlers: RowHandler<T>[] = []
  private rowRemoveHandlers: RowHandler<T>[] = []

  constructor() {
    super()

    this.containerEl = $(`<table class="typ-editable-table"></table>`)
      .append(
        '<thead></thead>',
        this.bodyEl = $('<tbody></tbody>').get(0) as any,
        '<tfoot></tfoot>',
      )
      .on('click', event => {
        const el = event.target as HTMLElement
        if (el.tagName === 'TH') return

        let btn: HTMLElement | null
        if (btn = el.closest('button')) {
          const op = btn.dataset.op!
          op === 'addRow' ? this.addRow() : this.removeRow(el)
          return
        }

        this.startEdit(el)
      })
      .get(0)
  }

  setHeaders(headers: TableHeader<T>[]) {
    this.headers = headers
    this.renderHeaders()
    this.renderFooter()
    return this
  }

  private renderHeaders() {
    const headers = this.headers.map(h => `<th>${h.title}</th>`)
      .concat(`<th><div><span class="fa fa-edit"></span></div></th>`)
      .join('')

    $('thead', this.containerEl)
      .empty()
      .html(headers)
  }

  private addRow() {
    this.renderRow({} as any, this.data.length)
    this.data.push({} as any)
  }

  private removeRow(el: HTMLElement) {
    const tr = el.closest('tr')!
    const r = +tr.dataset.r!
    this.rowRemoveHandlers.forEach(fn =>
      fn(this.data.splice(r, 1).at(0)!)
    )
    tr.remove()
    $('tr', this.bodyEl).each((r, tr) => {
      tr.dataset.r = r + ''
    })
  }

  private renderFooter() {
    const footer = `<tr><td colspan="${this.headers.length}"></td><td><button class="typ-button" data-op="addRow"><span class="fa fa-plus"></span></button></td></tr>`

    $('tfoot', this.containerEl)
      .empty()
      .html(footer)
  }

  setData(data: T[]) {
    this.data = data
    this.renderBody()
    return this
  }

  private renderBody() {
    $(this.bodyEl).empty()

    this.data.forEach((row, r) => this.renderRow(row, r))
  }

  private renderRow(row: T, r: number) {
    const cells = this.headers.map(h => `<td>${row[h.prop] ?? ''}</td>`)
      .concat(removeRowCell)
      .join('')

    $(this.bodyEl)
      .append(html`<tr data-r="${r}">${cells}</tr>`)
  }

  onRowChange(listener: RowHandler<T>) {
    this.rowChangeHandlers.push(listener)
    return this
  }

  onRowRemove(listener: RowHandler<T>) {
    this.rowRemoveHandlers.push(listener)
    return this
  }

  private startEdit(el: HTMLElement) {
    const tr = el.closest('tbody tr') as HTMLTableRowElement | null
    if (!tr) return
    if (tr === this.editingRowEl) return

    if (this.editingRowEl) {
      Array.from(this.editingRowEl.cells)
        .slice(0, -1)
        .forEach((td, i) => {
          const r = +this.editingRowEl!.dataset.r!
          td.innerText = this.data[r][this.headers[i].prop] ?? ''
        })
    }
    this.editingRowEl = tr

    const r = +tr.dataset.r!
    Array.from(tr.cells).forEach((td, i) => {
      const { type, prop } = this.headers[i] ?? {}
      if (!type) return

      $(td)
        .empty()
        .append(
          $(`<input type="${type}" value="${this.data[r][prop] ?? ''}">`)
            .on('change', event => {
              this.data[r][prop] = (<HTMLInputElement>event.target).value as any
              this.rowChangeHandlers.forEach(fn => fn(this.data[r]))
            }))
    })
  }
}
