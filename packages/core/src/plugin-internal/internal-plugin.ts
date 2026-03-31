import { useService } from 'src/common/service'
import { Plugin } from '../plugin/plugin'


export interface InternalPluginManifest {
  id: string
  name: string
  description: string
}

export class InternalPlugin extends Plugin<any> {

  manifest: any = {}

  get settings() { return useService('settings') }
  get dataPath() { return '[Internal core.json]' }

  constructor(id: string) {
    super(useService('app'), ({ id } as any))
  }

  /** @ignore useless in internal plugin */
  registerSettings() { }
}
