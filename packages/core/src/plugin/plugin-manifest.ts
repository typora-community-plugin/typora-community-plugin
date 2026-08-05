import type { App } from ".."


export type PluginPosition = 'global' | 'vault'

export interface PluginManifest {
  position?: PluginPosition
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
  platforms: Array<App['platform']>
}
