import 'core-js/modules/es.array.at'
import 'core-js/modules/es.array.flat-map'
import 'src/io/logger'
import { App } from 'src/app'
import { useService } from 'src/common/service'


const app: App = useService('app')

if (process.env.IS_DEV) {
  // @ts-ignore
  const { devtools } = await import('./devtools')
  setTimeout(() => app.use(devtools))
}

app.start()
