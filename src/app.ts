import {Body} from './body.js'
import {Context} from './context.js'
import {HttpError} from './httpError.js'
import {headersToObject, objectToHeaders} from './lib/utils.js'
import {Router} from './router/router.js'
import {Server} from './server.js'

interface AppOptions {
  router?: Router
}

export class App {
  readonly router: Router

  constructor(options: AppOptions = {}) {
    this.router = options.router ?? new Router()
  }

  async listen(...args: Parameters<typeof Server.listen>) {
    const server = Server.listen(...args)
    for await (let {request, response} of server) {
      try {
        const headers = objectToHeaders(request.headers)
        const url = new URL(request.url, `http://${request.headers['host']}`)
        const ctx = new Context({
          method: request.method,
          url,
          headers,
          body: new Body(request, headers),
        })
        const result = await this.#handle(ctx)

        response.writeHead(result.status, headersToObject(result.header))
        if (response.writable) response.end(result.body)
      } catch (e) {
        console.error(e)
        response.destroy()
      }
    }
  }

  async listenTls(...args: Parameters<typeof Server.listenTls>) {
    const server = Server.listenTls(...args)
    for await (let {request, response} of server) {
      try {
        const headers = objectToHeaders(request.headers)
        const url = new URL(request.url, `https://${request.headers['host']}`)
        const ctx = new Context({
          method: request.method,
          url,
          headers,
          body: new Body(request, headers),
        })
        const result = await this.#handle(ctx)

        response.writeHead(result.status, headersToObject(result.header))
        if (response.writable) response.end(result.body)
      } catch (e) {
        console.error(e)
        response.destroy()
      }
    }
  }

  async listenH2(...args: Parameters<typeof Server.listenH2>) {
    const server = Server.listenH2(...args)
    for await (let request of server) {
      try {
        const headers = objectToHeaders(request.headers)
        const url = new URL(headers.get(':path'), `https://${headers.get(':authority')}`)
        const ctx = new Context({
          method: headers.get(':method'),
          url,
          headers,
          body: new Body(request.stream, headers),
        })
        const response = await this.#handle(ctx)

        request.stream.respond({
          ':status': response.status,
          ...headersToObject(response.header),
        })
        if (request.stream.writable) request.stream.end(response.body)
      } catch (e) {
        console.error(e)
        request.stream.destroy()
      }
    }
  }

  async listenH2C(...args: Parameters<typeof Server.listenH2C>) {
    const server = Server.listenH2C(...args)
    for await (let request of server) {
      try {
        const headers = objectToHeaders(request.headers)
        const url = new URL(headers.get(':path'), `http://${headers.get(':authority')}`)
        const ctx = new Context({
          method: headers.get(':method'),
          url,
          headers,
          body: new Body(request.stream, headers),
        })
        const response = await this.#handle(ctx)

        request.stream.respond({
          ':status': response.status,
          ...headersToObject(response.header),
        })
        if (request.stream.writable) request.stream.end(response.body)
      } catch (e) {
        console.error(e)
        request.stream.destroy()
      }
    }
  }

  async #handle(ctx: Context): Promise<ReturnType<typeof Context.Response>> {
    await Router.Exec(this.router, ctx).catch(reason => {
      if (reason instanceof HttpError) {
        ctx.json({
          error: {
            status: reason.status,
            message: reason.expose ? reason.message : 'Server Error',
          },
        }, {
          status: reason.status,
          headers: reason.headers,
        })
      }

      throw reason
    })

    const response = Context.Response(ctx)

    // compress response
    /*if (response.compress) {
      let skip = response.body.byteLength < COMPRESS_MIN_SIZE
        || ctx.header.has('content-encoding')
        || ctx.header.has('content-range')

      const alg = acceptEncoding(ctx.headers, this.compress?.accept ?? ['br', 'gzip', 'identity'])
      if (!skip && alg === 'identity') {
        // response.body = await
        // response.body = await compressor()
        response.header.set('content-length', response.body.byteLength.toString())
        response.header.set('content-encoding', alg)
      }
    }*/

    // remove body
    if (ctx.method == 'HEAD') Context.Response(ctx).body = new Uint8Array(0)

    return response
  }
}
