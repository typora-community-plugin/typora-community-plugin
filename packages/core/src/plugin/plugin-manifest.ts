export type PluginPostion = 'global' | 'vault'

export interface PluginManifest {
  postion?: PluginPostion
  /** Plugin dir full path */
  dir?: string

  id: string
  name: string
  description: string
  author: string
  authorUrl: string
  /**
   * @since v2.0.0-beta.29
   */
  repo: string
  version: string
  minAppVersion: string
  minCoreVersion: string
}
