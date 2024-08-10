import 'core-js/modules/es.array.at'
import 'core-js/modules/es.array.flat-map'
import 'src/setup'
import { useService } from 'src/common/service'


const app = useService('app')

if (process.env.IS_DEV) {
  // @ts-ignore
  const { devtools } = await import('./devtools')
  setTimeout(() => app.use(devtools))
}

app.start()
