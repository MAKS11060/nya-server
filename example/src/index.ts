import {App, Router} from '@maks11060/nya-server'

const app = new App()
app.listenH2C({port: 50001})

app.router.use(async (ctx, done) => {
  let ts = performance.now()
  await done()
  ctx.header.set('x-time', (performance.now() - ts).toFixed(4))
})

app.router.get('/api/get', ctx => {
  ctx.json({})
})
