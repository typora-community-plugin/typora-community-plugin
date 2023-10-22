/// <reference types="jquery" />

export declare var _options: {
  appLocale: string
  appVersion: string
  initFilePath: string
  mountFolder: string
  tempPath: string
  userDataPath: string
  userPath: string
}


/**
 * Can only be accessed in macOS.
 */
export declare var bridge: {

  callHandler(cmd: "controller.openFolder", path: string): void
  callHandler(cmd: "controller.openInTypora", path: string): void
  callHandler(cmd: "controller.runCommand", opts: { args: string, cwd: string }, cb: ((results: [boolean, string, string, string]) => void)): void
  callHandler(cmd: "controller.showErrorDialog", msg: string): void
  //
  callHandler(cmd: "document.enterOversize"): void
  callHandler(cmd: "document.getContent", cb: (content: string) => void): void
  callHandler(cmd: "document.getDataFromFile"): void
  //
  callHandler(cmd: "library.fetchAllDocs", folder: string): void
  callHandler(cmd: "library.getRecentFolders", cb: (param0: any) => void): void
  callHandler(cmd: "library.listDocsUnder", folder: string, cb: (file: TFile) => void): void
  callHandler(cmd: "library.moveFile", opts: { source: string, dest: string, shouldOpen: boolean }): void
  callHandler(cmd: "library.newFile", filepath: string, cb: (param0: any) => void): void
  callHandler(cmd: "library.newFileUnder", folder: string): void
  callHandler(cmd: "library.newFolder", path: string, cb: (success: boolean) => void): void
  callHandler(cmd: "library.renameFile", opts: { old: string, new: string }, cb: (param0: any) => void): void
  callHandler(cmd: "library.search", opts: { text: string, caseSensitive: boolean, wholeWord: boolean, args: string[] }, cb: (param0: any) => void): void
  callHandler(cmd: "library.showProperty", filepath: string): void
  callHandler(cmd: "library.trashItem", filepath: string, cb: (param0: any) => void): void
  callHandler(cmd: "library.updateListItem", opts: { path: string, mark: boolean }): void
  callHandler(cmd: "library.updateListItemIfIsOpen", path: string): void
  //
  callHandler(cmd: "path.isDirectory", path: string, cb: (value: boolean) => void): void
  callHandler(cmd: "path.moveTo", opts: { source: string, folder: string }, cb: (param0: any) => void): void
  callHandler(cmd: "path.openFile", opts: { url: string, relateToFolder: boolean }, cb: (success: boolean) => void): void
  callHandler(cmd: "path.openURL", url: string): void
  callHandler(cmd: "path.removeFiles", files: string[]): void
  //
  callHandler(cmd: "quickOpen.cacheRecentFiles"): void
  callHandler(cmd: "quickOpen.initFileCache"): void
  callHandler(cmd: "quickOpen.query", query: string): void
  callHandler(cmd: "quickOpen.reindexFolderIfNeeded"): void
  callHandler(cmd: "quickOpen.setSearchState"): void
  callHandler(cmd: "quickOpen.setRecentFiles"): void
  callHandler(cmd: "quickOpen.setRecentFolders"): void
  callHandler(cmd: "quickOpen.stopQuery"): void
  callHandler(cmd: "quickOpen.updateCacheByRename"): void
  callHandler(cmd: "quickOpen.updateCache"): void
  callHandler(cmd: "quickOpen.updateResult"): void
  //
  callHandler(cmd: "touchBar.setFencesOnSetLang", value: boolean): void
  //
  callHandler(cmd: "window.focus"): void
  callHandler(cmd: "window.pasteAsPlainText"): void
  callHandler(cmd: "window.previewFile", path: string): void
  callHandler(cmd: "window.setTitlebarTextMarginLeft", margin: number | null): void
  //
  callHandler(cmd: string, data?: any, cb?: (param0: any) => void): void

  callSync(method: "clipboard.readText"): string
  callSync(method: "contextMenu.setItems", param1: any): any
  callSync(method: "document.isDocumentEdited"): boolean
  callSync(method: "images.convertFakeUrl", url: string): string
  callSync(method: "path.readText", filepath: string): string
  //
  callSync(method: string, data?: any, cb?: (param0: any) => void): any
}


export declare var ClientCommand: TClientCommand

interface TClientCommand {
  copyAsMarkdown(): void
  setTheme(cssFilename: string): void

  /**
   * Toggle Chrome Devtools.
   */
  toggleDevTools(): void

  togglePreferencePanel(): void
  showPreferencePanel(): void

  toggleOutline(): void
  toggleFileList(): void
  toggleFileTree(): void

  pinWindow(): void
  unpinWindow(): void
}


export declare var debugMode: boolean


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
  /**
   * Openned folder path.
   */
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
  fileEncode: string
  fileName: string

  /**
   * @since Typora v1.4.x
   */
  filePath: string

  hasMidified: boolean
  modifiedDate: Date
  savedContent: string
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

  /**
   * Get current note's markdown string.
   */
  getMarkdown(): string

  reset(markdown: string): void
  tryOpenLink($el: JQuery, param1?: boolean): void

  /**
   * @deprecated in Typora v1.2.x
   */
  tryOpenUrl_(url: string, param1?: boolean): void
  /**
   * @param url relative file path or web url
   */
  tryOpenUrl(url: string, param1?: boolean): void
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

  /**
   * Switch sidebar view.
   */
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
  hideSearch(param0?: boolean): void
  show(): void
  showSearch(param0?: boolean): void
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
  cacheFolder(mountFolder: string): void
  initFileCache(paths: string[], fileNames: string[], modifiedDates: Date[], param3: any, param4: any): void
  addInitFiles(filePaths: string[], fileNames: string[], modifiedDates: Date[]): void
  removeInitFiles(filePath: string): void

  setRecentFiles(files: string[]): void
  setRecentFolders(folders: string[]): void

  show(): void
  close(): void
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

  scrollAdjust($el?: JQuery, offset2Top?: number, param2?: number, param3?: boolean): void
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
  invoke(command: "app.cancelQuit"): Promise<any>
  invoke(command: "app.onCloseWin", folder: string): Promise<any>
  invoke(command: "app.openFile", path: string, opts: { forceCreateWindow: boolean, mountFolder: string }): Promise<any>
  invoke(command: "app.openFileOrFolder", path: string, opts: { forceCreateWindow: boolean, mountFolder: string }): Promise<any>
  invoke(command: "app.openOrSwitch"): Promise<any>
  //
  invoke(command: "app.sendEvent", event: "willRename", data: { oldPath: string }): Promise<any>
  invoke(command: "app.sendEvent", event: "didRename", data: { oldPath: string, newPath: string }): Promise<any>
  invoke(command: "app.sendEvent", event: "willSave", filePath: string): Promise<any>
  invoke(command: "app.sendEvent", event: "didSave", data: { path: string, summary: any, lastModifiedDate: any }): Promise<any>
  //
  invoke(command: "clipboard.write", jsonStr: string): Promise<any>
  invoke(command: "controller.switchFolder", path: string): Promise<any>
  invoke(command: "document.checkIfMoveOnSave", path: string): Promise<any>
  //
  invoke(command: "document.currentPath"): Promise<any>
  invoke(command: "document.enterOversize"): Promise<any>
  invoke(command: "document.getContent"): Promise<any>
  invoke(command: "document.hasDuplicateName", filename: string): Promise<any>
  invoke(command: "document.loadInitData"): Promise<any>
  invoke(command: "document.newWindow"): Promise<any>
  invoke(command: "document.noOtherWindow"): Promise<any>
  invoke(command: "document.rename", newPath: string): Promise<any>
  invoke(command: "document.setContent", content: string): Promise<any>
  invoke(command: "document.switchDocument", path: string): Promise<any>
  invoke(command: "document.switchToUntitled", filename?: string, isFileExist?: boolean): Promise<any>
  //
  invoke(command: "executeJavaScript", i: number, code: string): Promise<any>
  invoke(command: "filesOp.clearUndo"): Promise<any>
  invoke(command: "menu.refreshThemeMenu"): Promise<any>
  invoke(command: "menu.updateCustomZoom"): Promise<any>
  invoke(command: "pandoc.version"): Promise<any>
  //
  invoke(command: "setting.clearRecentDocuments"): Promise<any>
  invoke(command: "setting.fetchAnalytics"): Promise<any>
  invoke(command: "setting.getDownloadingDicts"): Promise<any>
  invoke(command: "setting.getKeyBinding"): Promise<any>
  invoke(command: "setting.getRecentFiles"): Promise<any>
  invoke(command: "setting.getThemes"): Promise<any>
  invoke(command: "setting.getUnsavedDraftsPath"): Promise<any>
  invoke(command: "setting.getUserDict"): Promise<any>
  invoke(command: "setting.getUserDictionaryPath"): Promise<any>
  invoke(command: "setting.loadExports"): Promise<any>
  invoke(command: "setting.removeRecentDocument", path: string): Promise<any>
  invoke(command: "setting.setCurTheme", path: string, name: string): Promise<any>
  //
  /** Open file with default application. */
  invoke(command: "shell.openItem", path: string): Promise<any>
  invoke(command: "shell.trashItem", path: string): Promise<any>
  //
  invoke(command: "theme.setThemeSource", mode: "system" | "light" | "dark"): Promise<any>
  //
  invoke(command: "url.request", url: string): Promise<any>
  //
  invoke(command: "webContents.cut"): Promise<any>
  invoke(command: "webContents.copy"): Promise<any>
  invoke(command: "webContents.paste"): Promise<any>
  invoke(command: "webContents.redo"): Promise<any>
  invoke(command: "webContents.selectAll"): Promise<any>
  invoke(command: "webContents.undo"): Promise<any>
  //
  invoke(command: "window.checkAsFocus"): Promise<any>
  invoke(command: "window.close"): Promise<any>
  invoke(command: "window.focus"): Promise<any>
  invoke(command: "window.fullscreen"): Promise<any>
  invoke(command: "window.inspectElement", x: number, y: number): Promise<any>
  invoke(command: "window.loadFinished"): Promise<any>
  invoke(command: "window.maximize"): Promise<any>
  invoke(command: "window.minimize"): Promise<any>
  invoke(command: "window.pin"): Promise<any>
  invoke(command: "window.restore"): Promise<any>
  invoke(command: "window.setInSourceMode", value: boolean): Promise<any>
  invoke(command: "window.setMenuBarVisibility", value: boolean): Promise<any>
  invoke(command: "window.toggleDevTools"): Promise<any>
  invoke(command: "window.unpin"): Promise<any>
  //
  invoke(command: string, ...args: any[]): Promise<any>

  putSetting(key: string, value: any): void

  showInBrowser(url: string): void
}

/**
 * Get current note's markdown string.
 */
export declare function getMarkdown(): string


/**
 * Import commonjs module.
 */
export declare function reqnode(id: string): any
