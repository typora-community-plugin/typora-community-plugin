import 'core-js/modules/es.array.at'
import 'core-js/modules/es.array.flat-map'
import 'src/io/logger'
import 'src/app'
import 'src/command/command-manager'
import 'src/hotkey-manager'
import 'src/locales/i18n'
import "src/io/vault"
import 'src/net/github'
import "src/plugin/plugin-manager"
import 'src/settings/settings'
import 'src/ui/workspace'
import 'src/ui/editor/markdown-editor'
import 'src/ui/ribbon/workspace-ribbon'
import { useService } from 'src/common/service'


const app = useService('app')

if (process.env.IS_DEV) {
  // @ts-ignore
  const { devtools } = await import('./devtools')
  setTimeout(() => app.use(devtools))
}

app.start()
