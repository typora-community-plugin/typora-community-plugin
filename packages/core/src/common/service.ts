import type { App, AppSettings, EnvironmentVairables } from "src/app"
import type { CommandManager } from "src/command/command-manager"
import type { ConfigRepository } from "src/io/config-repository"
import type { ExportManager } from "src/export-manager"
import type { HotkeyManager } from "src/hotkey-manager"
import type { ILogger } from "src/io/logger"
import type { Vault } from "src/io/vault"
import type { I18n } from "src/locales/i18n"
import type { InputBox, QuickPick } from "src/ui/components/quick-open"
import * as Locale from 'src/locales/lang.en.json'
import type { GithubAPI } from "src/net/github"
import type { PluginManager } from "src/plugin/plugin-manager"
import type { PluginMarketplace } from "src/plugin/plugin-marketplace"
import type { Settings } from "src/settings/settings"
import type { TabsView } from "src/ui/tabs/tabs-view"
import type { MarkdownEditor } from "src/ui/editor/markdown-editor"
import type { MarkdownRenderer } from "src/ui/editor/markdown-renderer"
import type { WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import type { FileExplorer } from "src/ui/sidebar/file-explorer"
import type { Sidebar } from "src/ui/sidebar/sidebar"
import type { ViewManager } from "src/ui/view-manager"
import type { Workspace } from "src/ui/workspace"
import type { WorkspaceRoot } from "src/ui/layout/workspace-root"
import type { Direction, WorkspaceSplit } from "src/ui/layout/split"
import type { WorkspaceTabs } from "src/ui/layout/tabs"
import type { Notice } from "src/ui/components/notice"
import { isDebug } from "./constants"


type ServiceMap = {
  'app'(): App
  'command-manager'(): CommandManager
  'config-repository'(): ConfigRepository
  'env'(): EnvironmentVairables
  'exporter'(): ExportManager
  'github'(): GithubAPI
  'hotkey-manager'(): HotkeyManager
  'i18n'(): I18n<typeof Locale>
  'logger'(scope?: string): ILogger
  'plugin-manager'(): PluginManager
  'plugin-marketplace'(): PluginMarketplace
  'settings'(): Settings<AppSettings>
  'vault'(): Vault

  'view-manager'(): ViewManager
  'workspace'(): Workspace
  'file-tabs'(): TabsView
  'markdown-editor'(): MarkdownEditor
  'markdown-renderer'(): MarkdownRenderer
  'ribbon'(): WorkspaceRibbon
  'file-explorer'(): FileExplorer
  'sidebar'(): Sidebar
  'input-box'(): InputBox
  'quick-pick'(): QuickPick
  'notice'(message: string, delay?: number): Notice

  'workspace-root'(): WorkspaceRoot
  'workspace-split'(direction: Direction): WorkspaceSplit
  'workspace-tabs'(): WorkspaceTabs
}

const services: Partial<ServiceMap> = {}
const loadedServices: Record<string, boolean> = {}
const stacks: string[] = []
const fixedSerivcesLoadingOrder: (keyof ServiceMap)[] = [
  'app', 'config-repository', 'settings', 'i18n', 'workspace'
]

export function registerService<K extends keyof ServiceMap>
  (id: K, factory: (args: Parameters<ServiceMap[K]>) => ReturnType<ServiceMap[K]>) {
  services[id] = factory as any
}

export function useService<K extends keyof ServiceMap>(id: K, args?: Parameters<ServiceMap[K]>) {
  if (process.env.IS_DEV) {

    if (!services[id]) {
      throw Error(`[Service] "${id}" is not registered.`)
    }
    if (stacks.includes(id)) {
      throw Error(`[Service] Circular dependency detected: ${[...stacks, id].join(' → ')}`)
    }
    if (fixedSerivcesLoadingOrder.includes(id)) {
      const index = fixedSerivcesLoadingOrder.indexOf(id)
      if (index !== 0) {
        throw Error(`[Service] "${id}" should be loaded before: ${fixedSerivcesLoadingOrder.slice(0, index).join(' → ')}`)
      }
      else {
        fixedSerivcesLoadingOrder.shift()
      }
    }
  }

  stacks.push(id)

  if (isDebug() && !loadedServices[id]) {
    loadedServices[id] = true
    console.log(`[Service] Loading "${stacks.join(' → ')}"...`)
  }

  const service = (<any>services[id])(args) as ReturnType<ServiceMap[K]>

  stacks.pop()

  return service
}
