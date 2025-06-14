import path from "./path"
import { Logger } from "./io/logger"
import { App } from "./app"
import { coreDir } from "./common/constants"
import { CommandManager } from "./command/command-manager"
import { registerService, useService } from "./common/service"
import { HotkeyManager } from "./hotkey-manager"
import { ConfigRepository } from "./io/config-repository"
import { Vault } from "./io/vault"
import { DEFALUT_OPTIONS, I18n } from "./locales/i18n"
import { GithubAPI } from "./net/github"
import { PluginManager } from "./plugin/plugin-manager"
import { memorize } from "./utils/function/memorize"
import * as Locale from './locales/lang.en.json'
import { Settings } from "./settings/settings"
import { Workspace } from "./ui/workspace"
import { MarkdownEditor } from "./ui/editor/markdown-editor"
import { DEFAULT_RIBBON_SETTINGS, WorkspaceRibbon } from "./ui/ribbon/workspace-ribbon"
import { DEFAULT_APPEARANCE_SETTINGS } from "./ui/settings/tabs/appearance-setting-tab"
import { DEFAULT_FILE_LINK_SETTINGS } from "./ui/settings/tabs/file-link-setting-tab"
import { DEFAULT_PLUGIN_MARKETPLACE_SETTINGS } from "./ui/settings/tabs/plugin-marketplace-setting-tab"
import { PluginMarketplace } from "./plugin/plugin-marketplace"
import { InputBox, QuickPick } from "./ui/components/quick-open"
import { Notice } from "./ui/components/notice"
import { FileExplorer } from "./ui/sidebar/file-explorer"
import { ExportManager } from "./export-manager"



registerService('logger', memorize(([scope]) => new Logger(scope)))

registerService('app', memorize(() => new App()))
registerService('env', () =>
  // @ts-ignore
  window[Symbol.for(`${process.env.CORE_NS}:env`)] ?? {}
)

registerService('command-manager', memorize(() => new CommandManager()))

registerService('exporter', memorize(() => new ExportManager()))

registerService('hotkey-manager', memorize(() => new HotkeyManager()))

registerService('i18n', memorize(() => {
  const i18n = new I18n<typeof Locale>({
    localePath: path.join(coreDir(), 'locales'),
    userLang: useService('settings').get('displayLang'),
  })

  DEFALUT_OPTIONS.userLang = i18n.locale

  return i18n
}))

registerService('input-box', memorize(() => new InputBox()))
registerService('quick-pick', memorize(() => new QuickPick()))

registerService('vault', memorize(() => new Vault()))
registerService('config-repository', memorize(() => new ConfigRepository()))

registerService('github', memorize(() => new GithubAPI()))

registerService('settings', memorize(() => {
  const settings = new Settings<any>({
    filename: 'core',
    version: 1,
  })

  settings.setDefault(DEFAULT_FILE_LINK_SETTINGS)
  settings.setDefault(DEFAULT_APPEARANCE_SETTINGS)
  settings.setDefault(DEFAULT_PLUGIN_MARKETPLACE_SETTINGS)
  settings.setDefault(DEFAULT_RIBBON_SETTINGS)

  return settings
}))

registerService('plugin-manager', memorize(() => new PluginManager()))
registerService('plugin-marketplace', memorize(() => new PluginMarketplace()))

registerService('workspace', memorize(() => new Workspace()))
registerService('markdown-editor', memorize(() => new MarkdownEditor()))
registerService('ribbon', memorize(() => new WorkspaceRibbon()))
registerService('file-explorer', memorize(() => new FileExplorer()))
registerService('sidebar', memorize(() => useService('workspace').sidebar))
registerService('notice', ([message, delay]) => new Notice(message, delay))
