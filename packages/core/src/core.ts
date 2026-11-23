import 'core-js/modules/es.array.at'
import 'core-js/modules/es.array.flat-map'
import 'core-js/modules/es.global-this'
import 'core-js/modules/es.object.has-own'
import 'core-js/modules/es.string.trim-end'
import 'src/setup'
import { useService } from 'src/common/service'


if (process.env.IS_DEV) {
  // biome-ignore lint/suspicious/noTsIgnore: top-level await only errors under the ES5 build config; @ts-expect-error is unused under the ESNext dev tsconfig
  // @ts-ignore
  const { devtools } = await import('./devtools')
  devtools()
}

const app = useService('app')

app.start()
