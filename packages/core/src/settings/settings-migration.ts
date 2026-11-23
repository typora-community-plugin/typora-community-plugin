import type { AppSettings } from "src/app"
import { KEY_OF_ENABLED_PLUGINS } from "src/plugin-internal/internal-plugin-manager"
import { PLUGIN_WORKSPACE_ID } from "src/plugin-internal/plugins/plugin-workspace"
import { SettingMigrations } from "./settings"


export function createSettingsMigration(): [number, SettingMigrations] {
  let currentVersion = 0
  const migrations = new SettingMigrations()

  migrations.addMigration(1, currentVersion = 2, ({ settings }: { settings: AppSettings }) => {
    // @ts-expect-error
    delete settings.showFileTabs

    if ('useWorkspace' in settings) {
      if (!settings[KEY_OF_ENABLED_PLUGINS]) settings[KEY_OF_ENABLED_PLUGINS] = {}
      // @ts-expect-error
      settings[KEY_OF_ENABLED_PLUGINS][PLUGIN_WORKSPACE_ID] = settings.useWorkspace
      // biome-ignore lint/suspicious/noTsIgnore: the `delete` operand check only triggers under the ES5 build lib; @ts-expect-error is unused under the ESNext dev tsconfig
      // @ts-ignore
      delete settings.useWorkspace
    }

    return {
      version: 2,
      settings,
    }
  })

  return [currentVersion, migrations]
}
