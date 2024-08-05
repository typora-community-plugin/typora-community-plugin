import type { App, AppSettings, EnvironmentVairables } from "src/app"
import type { CommandManager } from "src/command/command-manager"
import type { HotkeyManager } from "src/hotkey-manager"
import type { ConfigStorage } from "src/io/config-storage"
import type { Logger } from "src/io/logger"
import type { Vault } from "src/io/vault"
import type { I18n } from "src/locales/i18n"
import * as Locale from 'src/locales/lang.en.json'
import type { GithubAPI } from "src/net/github"
import type { PluginManager } from "src/plugin/plugin-manager"
import type { Settings } from "src/settings/settings"
import type { MarkdownEditor } from "src/ui/editor/markdown-editor"
import type { WorkspaceRibbon } from "src/ui/ribbon/workspace-ribbon"
import type { Sidebar } from "src/ui/sidebar/sidebar"
import type { Workspace } from "src/ui/workspace"


type ServiceMap = {
  'app'(): App
  'command-manager'(): CommandManager
  'config-storage'(): ConfigStorage
  'env'(): EnvironmentVairables
  'github'(): GithubAPI
  'hotkey-manager'(): HotkeyManager
  'i18n'(): I18n<typeof Locale>
  'logger'(): Logger
  'plugin-manager'(): PluginManager
  'settings'(): Settings<AppSettings>
  'vault'(): Vault

  'workspace'(): Workspace
  'markdown-editor'(): MarkdownEditor
  'ribbon'(): WorkspaceRibbon
  'sidebar'(): Sidebar
}

const services: Partial<ServiceMap> = {}

export function registerService<K extends keyof ServiceMap>
  (id: K, factory: (args: any[]) => ReturnType<ServiceMap[K]>) {
  services[id] = factory as any
}

export function useService<K extends keyof ServiceMap>(id: K, args?: any[]) {
  try {
    return (<any>services[id])(args) as ReturnType<ServiceMap[K]>
  }
  catch (error) {
    console.error(`[Typora Plugin] Service "${id}" is not registered.`)
  }
}
