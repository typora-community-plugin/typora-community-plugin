
export interface ConfigStorage {
  readConfigJson(filename: string, defaultValue?: any): any;
  writeConfigJson(filename: string, config: any): Promise<void>;
}
