import {Router} from '@maks11060/nya-server'

export const router = new Router({prefix: '/api'})

router.use((ctx, done) => {
  console.log(ctx.method, ctx.url.toString())
})

router.get('/get', ctx => {
  return ctx.json({})
})
