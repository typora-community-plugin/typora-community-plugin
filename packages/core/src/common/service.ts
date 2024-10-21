import type { App, AppSettings, EnvironmentVairables } from "src/app"
import type { CommandManager } from "src/command/command-manager"
import type { HotkeyManager } from "src/hotkey-manager"
import type { ConfigRepository } from "src/io/config-repository"
import type { ILogger } from "src/io/logger"
import type { Vault } from "src/io/vault"
import type { I18n } from "src/locales/i18n"
import type { InputBox, QuickPick } from "src/ui/components/quick-open"
import * as Locale from 'src/locales/lang.en.json'
import type { GithubAPI } from "src/net/github"
import type { PluginManager } from "src/plugin/plugin-manager"
import type { PluginMarketplace } from "src/plugin/plugin-marketplace"
import type { Settings } from "src/settings/settings"
import type { MarkdownEditor } from "src/ui/editor/markdown-editor"
import type { WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import type { Sidebar } from "src/ui/sidebar/sidebar"
import type { Workspace } from "src/ui/workspace"
import { isDebug } from "./constants"


type ServiceMap = {
  'app'(): App
  'command-manager'(): CommandManager
  'config-repository'(): ConfigRepository
  'env'(): EnvironmentVairables
  'github'(): GithubAPI
  'hotkey-manager'(): HotkeyManager
  'i18n'(): I18n<typeof Locale>
  'logger'(): ILogger
  'plugin-manager'(): PluginManager
  'plugin-marketplace'(): PluginMarketplace
  'settings'(): Settings<AppSettings>
  'vault'(): Vault

  'workspace'(): Workspace
  'markdown-editor'(): MarkdownEditor
  'ribbon'(): WorkspaceRibbon
  'sidebar'(): Sidebar
  'input-box'(): InputBox
  'quick-pick'(): QuickPick
}

const services: Partial<ServiceMap> = {}
const stacks: string[] = []
const fixedSerivcesLoadingOrder: (keyof ServiceMap)[] = [
  'app', 'config-repository', 'settings', 'i18n', 'workspace'
]

export function registerService<K extends keyof ServiceMap>
  (id: K, factory: (args: any[]) => ReturnType<ServiceMap[K]>) {
  services[id] = factory as any
}

export function useService<K extends keyof ServiceMap>(id: K, args?: any[]) {
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

  if (isDebug()) console.log(`[Service] Loading "${stacks.join(' → ')}"...`)

  const service = (<any>services[id])(args) as ReturnType<ServiceMap[K]>

  stacks.pop()

  return service
}
