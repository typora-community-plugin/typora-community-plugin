import { AppSettings } from "src/app"
import { SettingMigrations } from "./settings"
import { KEY_OF_ENABLED_PLUGINS } from "src/plugin-internal/internal-plugin-manager"
import { PLUGIN_WORKSPACE_ID } from "src/plugin-internal/plugins/plugin-workspace"


export function createSettingsMigration(): [number, SettingMigrations] {
  let currentVersion = 0
  const migrations = new SettingMigrations()

  migrations.addMigration(1, currentVersion = 2, ({ settings }: { settings: AppSettings }) => {
    // @ts-ignore
    delete settings.showFileTabs

    if ('useWorkspace' in settings) {
      if (!settings[KEY_OF_ENABLED_PLUGINS]) settings[KEY_OF_ENABLED_PLUGINS] = {}
      // @ts-ignore
      settings[KEY_OF_ENABLED_PLUGINS][PLUGIN_WORKSPACE_ID] = settings.useWorkspace
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
