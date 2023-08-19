export interface PluginManifest {
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
