export interface PluginManifest {
  /** Plugin dir full path */
  dir?: string

  id: string
  name: string
  author: string
  version: string
  minAppVersion: string
  minLoaderVersion: string
  description: string
  authorUrl: string
}
