import { ServiceLogger } from "src/io/logger/service-logger"
import { App } from "./app"
import { CommandManager } from "./command/command-manager"
import { coreDir } from "./common/constants"
import { registerService, useService } from "./common/service"
import { ExportManager } from "./export-manager"
import { HotkeyManager } from "./hotkey-manager"
import { ConfigRepository } from "./io/config-repository"
import { Logger } from "./io/logger/logger"
import { Vault } from "./io/vault"
import { DEFAULT_OPTIONS, I18n } from "./locales/i18n"
import type * as Locale from './locales/lang.en.json'
import { MetadataManager, registerDefaultMetadataProviders } from "./metadata"
import { GithubAPI } from "./net/github"
import path from "./path"
import { PluginManager } from "./plugin/plugin-manager"
import { PluginMarketplace } from "./plugin/plugin-marketplace"
import { DEFAULT_INTERNAL_PLUGIN_SETTINGS, InternalPluginManager } from "./plugin-internal/internal-plugin-manager"
import { Settings } from "./settings/settings"
import { createSettingsMigration } from "./settings/settings-migration"
import { Notice } from "./ui/components/notice"
import { InputBox, QuickPick } from "./ui/components/quick-open"
import { MarkdownEditor } from "./ui/editor/markdown-editor"
import { MarkdownRenderer } from "./ui/editor/markdown-renderer"
import { WorkspaceSplit } from "./ui/layout/split"
import { WorkspaceTabs } from "./ui/layout/tabs"
import { DEFAULT_RIBBON_SETTINGS, WorkspaceRibbon } from "./ui/ribbon/workspace-ribbon"
import { SettingsModal } from "./ui/settings/settings-modal"
import { DEFAULT_APPEARANCE_SETTINGS } from "./ui/settings/tabs/appearance-setting-tab"
import { DEFAULT_FILE_LINK_SETTINGS } from "./ui/settings/tabs/file-link-setting-tab"
import { DEFAULT_PLUGIN_MARKETPLACE_SETTINGS } from "./ui/settings/tabs/plugin-marketplace-setting-tab"
import { DEFAULT_WORKSPACE_SETTINGS } from "./ui/settings/tabs-plugin/workspace"
import { FileExplorer } from "./ui/sidebar/file-explorer"
import { ViewManager } from "./ui/view-manager"
import { Workspace } from "./ui/workspace"
import { memorize } from "./utils/function/memorize"


// ── DEV ONLY: Attach logging listener to ServiceLogger._fire() output ──
if (process.env.IS_DEV) {
  const colorMap = { 'enter': '#2196f3', 'exit': '#4caf50', 'error': '#f44336' } as const

  ServiceLogger.onLog((entry) => {
    console.groupCollapsed(
      `%c${entry.scope}%c ${entry.method}%c${entry.displayArgs ?? ''}${entry.ms != null ? ` +${entry.ms.toFixed(2)}ms` : ''}`,
      'color:#fff;background:#555;padding:1px 4px;border-radius:3px;',
      `color:${colorMap[entry.direction]};font-weight:bold;`,
      'color:#888;',
    )
    console.groupEnd()
  })
}

// ── End dev logging setup ──


registerService('logger', memorize(([scope]) => new Logger(scope)))

registerService('app', memorize(() => new App()))
registerService('env', () =>
  // @ts-expect-error
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

  DEFAULT_OPTIONS.userLang = i18n.locale

  return i18n
}))

registerService('input-box', memorize(() => new InputBox()))
registerService('quick-pick', memorize(() => new QuickPick()))

registerService('vault', memorize(() => new Vault()))
registerService('config-repository', memorize(() => new ConfigRepository()))

registerService('github', memorize(() => new GithubAPI()))

registerService('settings', memorize(() => {
  const [version, migrations] = createSettingsMigration()
  const settings = new Settings<any>({
    filename: 'core',
    version,
    migrations,
  })

  settings.setDefault(DEFAULT_FILE_LINK_SETTINGS)
  settings.setDefault(DEFAULT_APPEARANCE_SETTINGS)
  settings.setDefault(DEFAULT_INTERNAL_PLUGIN_SETTINGS)
  settings.setDefault(DEFAULT_PLUGIN_MARKETPLACE_SETTINGS)
  settings.setDefault(DEFAULT_RIBBON_SETTINGS)
  settings.setDefault(DEFAULT_WORKSPACE_SETTINGS)

  return settings
}))

//
// `app.settings` has not finished loading in this file.
//

registerService('internal-plugin-manager', memorize(() => new InternalPluginManager()))
registerService('plugin-manager', memorize(() => new PluginManager()))
registerService('plugin-marketplace', memorize(() => new PluginMarketplace()))

registerService('view-manager', memorize(() => new ViewManager()))
registerService('workspace', memorize(() => new Workspace()))
registerService('settings-modal', memorize(() => new SettingsModal()))
registerService('markdown-editor', memorize(() => new MarkdownEditor()))
registerService('markdown-renderer', memorize(() => new MarkdownRenderer()))
registerService('ribbon', memorize(() => new WorkspaceRibbon()))
registerService('file-explorer', memorize(() => new FileExplorer()))
registerService('sidebar', memorize(() => useService('workspace').sidebar))
registerService('notice', ([message, delay]) => new Notice(message, delay))

registerService('workspace-root', memorize(() => useService('workspace').rootSplit))
registerService('workspace-floating', memorize(() => useService('workspace').floatingSplit))
registerService('workspace-split', ([direction]) => new WorkspaceSplit(direction))
registerService('workspace-tabs', () => new WorkspaceTabs())

registerService('metadata-manager', memorize(() => {
  const metadata = new MetadataManager()
  registerDefaultMetadataProviders(metadata)
  return metadata
}))
