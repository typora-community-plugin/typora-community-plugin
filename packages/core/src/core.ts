import { App } from './app'
import { devtools } from './devtools'


new App()
  .use(devtools)
  .start()
