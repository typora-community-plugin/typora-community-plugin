/// <reference types="jquery" />

export declare var _options: {
  appLocale: string
  appVersion: string
  initFilePath: string
  mountFolder: string
  userDataPath: string
}


export declare var ClientCommand: TClientCommand

interface TClientCommand {
  copyAsMarkdown(): void
  setTheme(cssFilename: string): void
  toggleDevTools(): void
}


export declare var File: File

interface File {

  bundle: Bundle

  changeCounter: ChangeCounter
  ChangeType: typeof ChangeType

  editor: Editor

  /**
   * @deprecated in Typora v1.4.x
   */
  filePath: string

  getContent(): string

  /**
   * Get openned folder path.
   */
  getMountFolder(): string
  mountFolder_: string

  isWin: boolean
  isLinux: boolean
  isMac: boolean
  isNode: boolean
  isSafari: boolean

  megaMenu: MegaMenu

  onFileOpened(): void

  option: Options

  readContentFrom(): [unknown, string]

  reloadContent(): void

  saveUseNode(param0?: boolean, param1?: boolean): Promise<any>

  setMountFolder(path: string): void

  SupportedFiles: string[]
}

interface Bundle {

  /**
   * @since Typora v1.4.x
   */
  filePath: string
}

interface ChangeCounter {
  updateChangeCount(type: ChangeType): void
}

declare enum ChangeType {
  NodeSaveFailed = -1,
  NSChangeDone = 0,
  NSChangeUndone = 1,
  NSChangeCleared = 2,
  NSChangeReadOtherContents = 3,
  NSChangeAutoSaved = 4,
  NSChangeRedone = 5,
}


export declare var editor: Editor

interface Editor {
  autoComplete: AutoComplete
  docMenu: DocMenu
  EditHelper: EditHelper
  fences: Fences
  imgEdit: ImageEdit
  library: Library
  localSettingBridge: LocalSettingBridge
  nodeMap: NodeMap
  quickOpenPanel: QuickOpenPanel
  selection: Selection
  stylize: Stylize
  undo: Undo
  UserOp: TUserOp
  wordCount: WordCount
  /** Editor writing area `div#write` */
  writingArea: HTMLElement

  getMarkdown(): string
  reset(markdown: string): void
  tryOpenLink($el: JQuery, param1?: boolean): void
}

interface AutoComplete {
  state: {
    anchor: TRange
    all: string[]
    match: string[]
  }
  initState(): void
  show(items: string[], anchor: any, text: string, opts: AutoCompleteOptions): void
  hide(): void
  apply(text: string): void
}

interface TRange {
  start: number
  end: number
  containerNode: HTMLElement
}

interface AutoCompleteOptions {
  type?: string
  search?(query: string): string[]
  /**
   * @returns HTML
   */
  render?(text: string, isActive: boolean): string
  beforeApply?(text: string): string
}

interface DocMenu {
  getMetaNode(): Node
  getValueInMeta(key: string, metaNode?: Node): string
  writeProperty(key: string, value: string): void
}

export declare class Node {

  static parseFrom(markdown: string): [string]

  id: string
  cid: string
  attributes: NodeAttribute

  __proto__: {
    constructor: typeof Node
  }
}

interface NodeAttribute {
  id: string
  type: "meta_block"
  text: string
  children: {
    _map: Map<string, Node>
    _set: []
    length: number
  }
  before?: Node
  after?: Node
}

interface EditHelper {
  /**
   * Show notification on top of editing area.
   *
   * @param msg Message. Can be a string with HTML.
   */
  showNotification(msg: string): void
}

interface Fences {
  getValue(cid: string): string
}

interface ImageEdit {
  getImageUploaderCommand(uploader?: string): string
  getRealSrc(url: string): string
  resolveImagePath(url: string): string
}

interface Library {

  fileTree: FileTreeView
  fileSearch: FileSearchView

  /**
   * @param normalizePath If path are not normalized, it may judge as different vault and open a new window to load the file.
   * @param callback When it call, writting area DOM is not prepared
   */
  openFile(normalizePath: string, callback?: Function): void

  refreshPanelCommand(): void

  setSidebarWidth(width: number, saveInSettings: boolean): void

  switch(view: '' | 'file-tree' | 'file-list' | 'outline', param1?: boolean): void
}

interface FileTreeView {
  expandNode($el: JQuery, filepath: string, callback: Function): void
  renderNode(file: TFile, notSort?: boolean): JQuery
}

interface TFile {
  name: string
  path: string
  fetched: boolean
  isDirectory: boolean
  isFile: boolean
  isOpen: boolean
  lastModified: Date
  /** sub directories */
  subdir: TFile[]
  /** sub files */
  content: TFile[]
}


interface FileSearchView {
  hide(): void
  showSearch(): void
}
interface LocalSettingBridge {
  loadExportOption(opt: ExportOption): ExportSetting
}

interface ExportOption {
  type: "html" | "html-plain" | "image" | "pdf" | "custom"
  allowPerFileSetting: boolean
}

interface ExportSetting {
  appendHead?: string
}

interface NodeMap {
  allNodes: NodeCollection
  blocks: NodeCollection
  foot_list: NodeCollection
  link_list: NodeCollection
  toc: any
}

interface NodeCollection {
  _map: Map<string, Node>

  get(id: string): Node | null

  _set: Node[]
  length: number

  add(node: Node): void
  at(index: number): Node | null
  first(): Node | null
  forEach(iteratee: (item: Node, index: number, arr: Node[]) => void, thisArgs?: any): void
  indexOf(node: Node): number
  map(iteratee: (item: Node, index: number, arr: Node[]) => void, thisArgs?: any): Node[]
  remove(node: Node): void
  sortedFirst(): Node | null
  sortedForEach(iteratee: (item: Node, index: number, arr: Node[], thisArgs?: any) => void): void

  reset(): void
  toArray(): Node[]
}

interface QuickOpenPanel {
  initFileCache(paths: string[], fileNames: string[], modifiedDates: Date[], param3: any, param4: any): void
  addInitFiles(filePaths: string[], fileNames: string[], modifiedDates: Date[]): void
  removeInitFiles(filePath: string): void
}

interface Selection {
  getRangy(): Rangy
  setRange(range: Rangy, param1: boolean): void

  getTextAround(): TextAround

  savedSel: Bookmark
  saveSelection($container: JQuery, rangy: Rangy): Bookmark
  restoreSelection($container: JQuery, bookmark?: Bookmark): void

  selectPhrase(): void
  selectWord(): void
}

type TextAround = [
  textBefore: string,
  textAfter: string,
  cursorRange: TRange
]

interface Rangy {
  collapsed: boolean
  startOffset: number
  endOffset: number

  setStart(el: Element, pos: number): void
  setEnd(el: Element, pos: number): void

  select(): void

  extractContents(): DocumentFragment
  cloneContents(): DocumentFragment
  deleteContents(): void
}

interface Bookmark {
  start: number
  end: number
  containerNode: HTMLElement
}

interface Stylize {
  insertMetaBlock(): void
}

interface Undo {
  UndoManager: UndoManager
}

interface UndoManager {
  commandStack: Command[]

  append(a: Command, b: Command): void
}

interface Command {
  date: any
  incomplete: any
  redo: any
  source: any
  undo: any
}

interface TUserOp {
  backspaceHandler(editor: Editor, event: Event | null, type: 'delSelection' | 'Backspace' | 'Delete'): void
  pasteHandler(editor: Editor, content: string, isMarkdown?: boolean, param3?: boolean | Function): void
  setClipboard(html: string | null, markhtml: string | null, text: string, shouldClear?: boolean, event?: any): void
}

interface WordCount {
  quickUpdate(param0: any, param1: any, param2: any): void
  update(markdown: string): void
}

interface MegaMenu {
  showPreferencePanel(): void
}

interface Options {
  imageUploader: string
}


export declare function isInputComponent(el: Element | null): boolean


export declare var JSBridge: {
  invoke(command: "app.openFileOrFolder", path: string, opts: { forceCreateWindow: boolean, mountFolder: string }): Promise<any>
  invoke(command: "app.sendEvent", event: "didRename", data: { oldPath: string, newPath: string }): Promise<any>
  invoke(command: "shell.trashItem", path: string): Promise<any>
  invoke(command: "theme.setThemeSource", mode: "system" | "light" | "dark"): Promise<any>
  invoke(command: string, ...args: any[]): Promise<any>
}


export declare function getMarkdown(): string


/**
 * Import commonjs module.
 */
export declare function reqnode(id: string): any
