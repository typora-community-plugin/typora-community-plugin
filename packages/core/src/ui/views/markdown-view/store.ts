import { Events } from 'src/common/events'
import type { WorkspaceTabs } from 'src/ui/layout/tabs'


export type MarkdownViewStoreEvents = {
  'state:parentTabs'(tabs: WorkspaceTabs | null): void
  'state:swappingFile'(filePath: string | null): void
}

export class MarkdownViewStore extends Events<MarkdownViewStoreEvents> {

  private _parentTabs: WorkspaceTabs | null = null
  private _swappingFile: string | null = null

  get parentTabs(): WorkspaceTabs | null { return this._parentTabs }

  setParentTabs(tabs: WorkspaceTabs | null): void {
    if (this._parentTabs === tabs) return
    this._parentTabs = tabs
    this.emit('state:parentTabs', tabs)
  }

  beginSwap(filePath: string): void {
    this._swappingFile = filePath
    this.emit('state:swappingFile', filePath)
  }

  endSwap(): void {
    if (this._swappingFile === null) return
    this._swappingFile = null
    this.emit('state:swappingFile', null)
  }

  isSwapping(filePath: string): boolean {
    return this._swappingFile === filePath
  }

  isActiveTabs(tabs: WorkspaceTabs): boolean {
    return this._parentTabs === tabs
  }

  getEditorTabsHasSingleChild(): boolean {
    return this._parentTabs?.children.length === 1 ?? false
  }
}
