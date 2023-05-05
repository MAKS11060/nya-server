import {HttpError} from '../../src/httpError.js'
import {Router} from '../../src/index.js'

export const router = new Router()

router.use((ctx, done) => {
  console.log(ctx.method, ctx.url.toString())
})

router.get('/api/get', ctx => {
  return ctx.json()
}, (reject, error) => {
})




