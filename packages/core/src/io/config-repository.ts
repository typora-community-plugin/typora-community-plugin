import { globalConfigDir } from "src/common/constants"
import { Events } from "src/common/events"
import { useService } from "src/common/service"
import fs from "src/io/fs/filesystem"
import path from "src/path"
import type { DisposeFunc } from "src/utils/types"


export type ConfigEvents = {
  'switch'(): void
}


export class ConfigRepository extends Events<ConfigEvents> {

  private _isUsingGlobalConfig = true
  private _disposeCommand: DisposeFunc

  private _configDir: string
  private _ensuredDirs = new Set<string>()

  constructor(
    protected logger = useService('logger', ['Config']),
    private vault = useService('vault'),
  ) {
    super('Config')

    this._autoSelectConfig()

    vault.on('change', () => this._autoSelectConfig())
  }

  /** whether config is currently read from the global config directory instead of the vault's local one */
  get isUsingGlobalConfig() {
    return this._isUsingGlobalConfig
  }

  /**
   * Currently active config directory. It is one of:
   * - the global config directory: shared by all vaults, used when the vault has no local config;
   * - the vault's local config directory: stored inside the vault, used when it exists.
   */
  get configDir() {
    return this._configDir
  }

  /** data directory inside the active config directory (global or vault-local) */
  get dataDir() {
    return path.join(this.configDir, 'data')
  }

  private _autoSelectConfig() {
    // No folder is mounted and no document is opened: there is no vault-local
    // config to look for, so skip the existence check on a relative `.typora` path.
    if (!this.vault.path) {
      // Keep the `switch` event asynchronous, so that listeners registered
      // right after construction, such as `App`, still receive it.
      Promise.resolve().then(() => this.useGlobalConfig())
      return
    }

    fs.isDirectory(this.vault.configDir)
      .then(exists => exists ? this.useVaultConfig() : this.useGlobalConfig())
      .catch(() => this.useGlobalConfig())
  }

  private useGlobalConfig() {
    if (this._configDir === globalConfigDir()) return
    this._disposeCommand?.()

    this._ensuredDirs.clear()
    this._configDir = globalConfigDir()
    this._isUsingGlobalConfig = true

    this.once('switch', () => {
      // Cannot switch to a vault-local config without a vault.
      if (!this.vault.path) return

      const commands = useService('command-manager')
      const i18n = useService('i18n')
      if (!commands || !i18n) return

      this._disposeCommand = commands.register({
        id: 'config:vault',
        title: i18n.t.config.commandUseVaultConfig,
        scope: 'global',
        callback: () => this.useVaultConfig(),
      })
    })

    this.emit('switch')
  }

  private useVaultConfig() {
    if (!this.vault.path) return

    if (this._configDir === this.vault.configDir) return
    this._disposeCommand?.()

    this._ensuredDirs.clear()
    this._configDir = this.vault.configDir
    this._isUsingGlobalConfig = false

    this.once('switch', () => {
      const commands = useService('command-manager')
      const i18n = useService('i18n')
      if (!commands || !i18n) return

      this._disposeCommand = commands.register({
        id: 'config:global',
        title: i18n.t.config.commandUseGlobalConfig,
        scope: 'global',
        callback: () => {
          this.useGlobalConfig()
          fs.remove(this.vault.configDir)
        },
      })
    })

    fs.isDirectory(this.vault.configDir)
      .catch(() => false)
      .then(exists => exists
        ? undefined
        : fs.mkdir(this.vault.configDir)
          .then(() => fs.copy(globalConfigDir(), this.vault.configDir))
      )
      .catch(error => this.logger.warn(`Failed to prepare config directory "${this.vault.configDir}".`, error))
      .then(() => this.emit('switch'))
  }

  /**
   * Read json in `configDir`
   *
   * @param filename File name without extension name `.json`
   * @param defaultValue value returned when the file cannot be read or parsed
   * @returns JSON Object
   */
  readConfigJson(filename: string, defaultValue: any = {}): any {
    try {
      const configPath = path.join(this.configDir, `${filename}.json`)
      const text = fs.readTextSync(configPath)
      return JSON.parse(text)
    } catch (_error) {
      this.logger.warn(`Failed to load config "${filename}.json"`)
      return defaultValue
    }
  }

  /**
   * Write json into `configDir`, creating its parent directory when needed
   *
   * @param filename File name without extension name `.json`
   * @param config JSON serializable object
   */
  writeConfigJson(filename: string, config: any): Promise<boolean> {
    const configPath = path.join(this.configDir, `${filename}.json`)
    const dirname = path.dirname(configPath)
    const text = JSON.stringify(config, null, 2)

    return this._ensureDir(dirname)
      .then(() => fs.readText(configPath).catch((): undefined => undefined))
      .then(current => {
        // macOS writes go through `controller.runCommand`, which shows an
        // approval dialog. Skip writes that would not change the file.
        if (typeof current === 'string' && current.replace(/\r?\n$/, '') === text) {
          return true
        }
        return fs.writeText(configPath, text).then(() => true)
      })
      .catch(error => {
        // The directory may have been removed since it was checked; retry the
        // check on the next save instead of failing forever.
        this._ensuredDirs.delete(dirname)
        this.logger.error(`Failed to save config "${filename}.json".`, error)
        return false
      })
  }

  private _ensureDir(dirname: string): Promise<void> {
    if (this._ensuredDirs.has(dirname)) return Promise.resolve()

    return fs.isDirectory(dirname)
      .catch(() => false)
      .then(exists => exists ? undefined : fs.mkdir(dirname))
      .then(() => {
        this._ensuredDirs.add(dirname)
      })
  }
}
