import { SettingMigrations } from "./settings"


export function createSettingsMigration(): [number, SettingMigrations] {
  let currentVersion = 0
  const migrations = new SettingMigrations()

  migrations.addMigration(1, currentVersion = 2, (oldStores) => {
    const { settings } = oldStores
    delete settings.showFileTabs
    delete settings.useWorkspace
    return {
      version: 2,
      settings,
    }
  })

  return [currentVersion, migrations]
}
