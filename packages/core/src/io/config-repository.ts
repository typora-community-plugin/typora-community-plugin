import { _options } from "typora"
import { Events } from "src/common/events"
import { useService } from "src/common/service"
import path from "src/path"
import fs from "src/io/fs/filesystem"
import { globalConfigDir } from "src/common/constants"


export type ConfigEvents = {
  'switch'(): void
}


export class ConfigRepository extends Events<ConfigEvents> {

  private _isUsingGlobalConfig = true

  private _configDir = globalConfigDir()

  constructor(
    protected logger = useService('logger', ['Config']),
    private vault = useService('vault'),
  ) {
    super('Config')

    setTimeout(() => {
      const commands = useService('command-manager')

      commands.register({
        id: 'command:global-config',
        title: 'Use global config',
        scope: 'global',
        callback: () => this.useGlobalConfig(),
      })

      commands.register({
        id: 'command:vault-config',
        title: 'Use vault config',
        scope: 'global',
        callback: () => this.useVaultConfig(),
      })

      commands.register({
        id: 'command:del-vault-config',
        title: 'Delete vault config',
        scope: 'global',
        callback: () => {
          this.useGlobalConfig()
          fs.remove(this.vault.configDir)
        },
      })
    })

    vault.on('change', () => {
      if (this.isUsingGlobalConfig) return
      this.useVaultConfig()
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

  useGlobalConfig() {
    if (this.isUsingGlobalConfig) return
    this._configDir = globalConfigDir()
    this._isUsingGlobalConfig = true
    this.emit('switch')
  }

  useVaultConfig() {
    if (!this.isUsingGlobalConfig) return
    this._configDir = this.vault.configDir
    this._isUsingGlobalConfig = false
    this.emit('switch')
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
