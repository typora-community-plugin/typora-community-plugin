import { App } from './app'


const app = new App()

if (process.env.IS_DEV) {
  // @ts-ignore
  const { devtools } = await import('./devtools')
  app.use(devtools)
}

app.start()
