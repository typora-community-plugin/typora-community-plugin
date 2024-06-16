
export interface VaultConfig {
  readConfigJson(filename: string, defaultValue?: any): any;
  writeConfigJson(filename: string, config: any): Promise<void>;
}
