import 'core-js/modules/es.array.at'
import 'core-js/modules/es.array.flat-map'
import 'core-js/modules/es.global-this'
import 'core-js/modules/es.string.trim-end'
import 'src/setup'
import { useService } from 'src/common/service'


if (process.env.IS_DEV) {
  // @ts-ignore
  const { devtools } = await import('./devtools')
  devtools()
}

const app = useService('app')

app.start()
