import { _options } from "typora"
import { Events } from "src/common/events"
import { useService } from "src/common/service"
import path from "src/path"
import fs from "src/io/fs/filesystem"
import { globalConfigDir } from "src/common/constants"
import type { DisposeFunc } from "src/utils/types"


export type ConfigEvents = {
  'switch'(): void
}


export class ConfigRepository extends Events<ConfigEvents> {

  private _isUsingGlobalConfig = true
  private _disposeCommand: DisposeFunc

  private _configDir = globalConfigDir()

  constructor(
    protected logger = useService('logger', ['Config']),
    private vault = useService('vault'),
  ) {
    super('Config')

    this._autoSelectConfig()

    vault.on('change', () => {
      if (this.isUsingGlobalConfig) return
      this._autoSelectConfig()
    })
  }

  get isUsingGlobalConfig() {
    return this._isUsingGlobalConfig
  }

  get configDir() {
    return this._configDir
  }

  get dataDir() {
    return path.join(this.configDir, 'data')
  }

  private _autoSelectConfig() {
    fs.access(this.vault.configDir)
      .then(() => this.useVaultConfig())
      .catch(() => this.useGlobalConfig())
  }

  private useGlobalConfig() {
    if (this.isUsingGlobalConfig) return
    this._disposeCommand?.()

    this._configDir = globalConfigDir()
    this._isUsingGlobalConfig = true

    this.once('switch', () => {
      const commands = useService('command-manager')
      const i18n = useService('i18n')

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
    if (this._configDir === this.vault.configDir) return
    this._disposeCommand?.()

    this._configDir = this.vault.configDir
    this._isUsingGlobalConfig = false

    this.once('switch', () => {
      const commands = useService('command-manager')
      const i18n = useService('i18n')

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

    fs.access(this.vault.configDir)
      .catch(() =>
        fs.mkdir(this.vault.configDir)
          .then(() => fs.copy(globalConfigDir(), this.vault.configDir))
      )
      .then(() => this.emit('switch'))
  }

  /**
   * Read json in `configDir`
   *
   * @param filename File name without extension name `.json`
   * @returns JSON Object
   */
  readConfigJson(filename: string, defaultValue: any = {}): any {
    try {
      const configPath = path.join(this.configDir, filename + '.json')
      const text = fs.readTextSync(configPath)
      return JSON.parse(text)
    } catch (error) {
      this.logger.warn(`Failed to load config "${filename}.json"`)
      return defaultValue
    }
  }

  writeConfigJson(filename: string, config: any) {
    const configPath = path.join(this.configDir, filename + '.json')
    const dirname = path.dirname(configPath)
    return fs
      .access(dirname)
      .catch(() => fs.mkdir(dirname))
      .then(() => fs.writeText(configPath, JSON.stringify(config, null, 2)))
      .catch(error => {
        this.logger.error(`Failed to save config "${filename}.json".`, error)
      })
  }
}
