import {App} from '@maks11060/nya-server'
import {router} from './routes.js'

const app = new App()
app.listenH2C({port: 50001})

app.router.setRouter(router)

app.router.use(async (ctx, done) => {
  let ts = performance.now()
  await done()
  ctx.header.set('x-time', (performance.now() - ts).toFixed(4))
})
