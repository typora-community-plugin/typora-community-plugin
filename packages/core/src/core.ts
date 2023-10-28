import 'core-js/modules/es.array.at'
import 'core-js/modules/es.array.flat-map'
import { App } from './app'


const app = new App()

if (process.env.IS_DEV) {
  // @ts-ignore
  const { devtools } = await import('./devtools')
  app.use(devtools)
}

app.start()
