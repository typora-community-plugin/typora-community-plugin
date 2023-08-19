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
  version: string
  minAppVersion: string
  minCoreVersion: string
}
