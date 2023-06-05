import {App} from 'nya-server'
import {Server} from 'nya-server/server'

const app = new App()
Server.listen(app.fetch, {transport: 'h2c', port: 50001})
const router = app.router

// performance
router.use(async (ctx, done) => {
  const start = performance.now()
  await done()
  const end = performance.now()
  ctx.header.set('x-time', `${(end - start).toFixed(5)}`)
})

// Compress
router.use(async (ctx, done) => {
  await done()
  /*if (ctx.headers.get('Accept-Encoding').includes('br')) {
    const r = Context.Response(ctx).body
    const br = createBrotliCompress()
    pipeline(Readable.fromWeb(r as NodeReadableStream), br)

    ctx.respondWith(new Response(Readable.toWeb(br) as ReadableStream<Uint8Array>, {
      headers: {'content-encoding': 'br'}
    }))
  }*/
})

router.get('/', ctx => {
  ctx.respond('123')
})

router.post('/', async ctx => {
  ctx.json({
    data: await ctx.request.text(),
  })
})


/*
import {Server} from '@maks11060/nya-server'
import http from 'node:http'

// const app = new App()
// app.listenH2C({port: 50001})
//
// app.router.setRouter(router)
//
// app.router.use(async (ctx, done) => {
//   let ts = performance.now()
//   await done()
//   ctx.header.set('x-time', (performance.now() - ts).toFixed(4))
// })


const data = crypto.randomUUID().replaceAll('-', '').repeat(100)
console.log(data.length)

const handle = async (request: http.IncomingMessage, response: http.ServerResponse) => {
  // console.log(request.method, request.url)
  // await setTimeout(500)
  response.end(data)
}

const serverNodeStyle = async (port: number) => {
  const server = http.createServer()
  server.listen(port)
  server.on('request', handle)
}

const serverDenoStyle = async (port: number) => {
  const server = Server.listen({
    transport: 'http',
    port,
  })
  for await (const {request, response} of server) {
    handle(request, response)
  }
}

// serverNodeStyle(50000)
serverDenoStyle(50000)*/

