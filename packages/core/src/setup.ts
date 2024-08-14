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
import { WorkspaceRibbon } from "./ui/ribbon/workspace-ribbon"



registerService('logger', memorize(([scope]) => new Logger(scope)))

registerService('app', memorize(() => new App()))
registerService('env', () =>
  // @ts-ignore
  window[Symbol.for(`${process.env.CORE_NS}:env`)] ?? {}
)

registerService('command-manager', memorize(() => new CommandManager()))

registerService('hotkey-manager', memorize(() => new HotkeyManager()))

registerService('i18n', memorize(() => {
  const i18n = new I18n<typeof Locale>({
    localePath: path.join(coreDir(), 'locales'),
    userLang: useService('settings').get('displayLang'),
  })

  DEFALUT_OPTIONS.userLang = i18n.locale

  return i18n
}))

registerService('vault', memorize(() => new Vault()))
registerService('config-repository', memorize(() => new ConfigRepository()))

registerService('github', memorize(() => new GithubAPI()))

registerService('settings', memorize(() =>
  new Settings({
    filename: 'core',
    version: 1,
  })
))

registerService('plugin-manager', memorize(() => new PluginManager()))

registerService('workspace', memorize(() => new Workspace()))
registerService('markdown-editor', memorize(() => new MarkdownEditor()))
registerService('ribbon', memorize(() => new WorkspaceRibbon()))
registerService('sidebar', memorize(() => useService('workspace').sidebar))
