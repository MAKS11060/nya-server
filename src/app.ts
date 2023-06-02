import http from 'node:http'
import http2 from 'node:http2'
import https from 'node:https'
import {Context} from './context.js'
import {HttpError} from './httpError.js'
import {h2respondWith, h2streamToWeb, requestToWeb, respondWith} from './lib/node-web.js'
import {Router} from './router/router.js'
import {ServerListenOptions} from './server.js'

declare var Response: {
  prototype: Response;
  new(body?: BodyInit | null, init?: ResponseInit): Response;
  error(): Response;
  json(data: any, init?: ResponseInit): Response
  redirect(url: string | URL, status?: number): Response;
}

interface AppOptions {
  router?: Router
}


export class App {
  readonly router: Router

  constructor(options: AppOptions = {}) {
    this.router = options?.router ?? new Router()
  }

  static listen(options: ServerListenOptions, listener?: () => void): App {
    const app = new this()

    // default http server
    if (!options.transport) options.transport = 'http'

    if (options.transport === 'http') {
      const server = http.createServer(options.server)
      server.listen(options, listener)
      server.on('request', async (req, res) => {
        const request = requestToWeb(req)
        respondWith(res, await app.fetch(request))
      })
    }
    if (options.transport === 'https') {
      const server = https.createServer(options.server)
      server.listen(options, listener)
      server.on('request', async (req, res) => {
        const request = requestToWeb(req)
        respondWith(res, await app.fetch(request))
      })
    }

    if (options.transport === 'h2c') {
      const server = http2.createServer(options.server)
      server.listen(options, listener)
      server.on('stream', async (stream, headers) => {
        const request = h2streamToWeb(stream, headers)
        h2respondWith(stream, await app.fetch(request))
      })
    }
    if (options.transport === 'h2') {
      const server = http2.createSecureServer(options.server)
      server.listen(options, listener)
      server.on('stream', async (stream, headers) => {
        const request = h2streamToWeb(stream, headers)
        h2respondWith(stream, await app.fetch(request))
      })
    }

    return app
  }

  async fetch(request: Request): Promise<Response> {
    const ctx = new Context(request)
    const res = await Router.Exec(this.router, ctx).catch(reason => {
      if (reason instanceof HttpError) {
        return ctx.json({
          error: {
            status: reason.status,
            message: reason.expose ? reason.message : 'Server Error',
          },
        }, {
          status: reason.status,
          headers: reason.headers,
        })
      }
      ctx.respond(new Uint8Array(0), {status: 500})
      throw reason
    })
    if (res) return res

    return Response.error()
  }
}


/*class Router<T> {
  add(method: string, path: string, handler: T): void {
  }

  match(method: string, path: string): T[] {
  }
}

const r1 = new Router<RouterHandler>()
r1.add('GET', '/', ctx => {
})


for (let match of r1.match('GET', '/')) {
  match()
}*/


/*import http from 'http'
import http2 from 'http2'
import https from 'https'
import net from 'net'
import {Body} from './body.js'
import {Context} from './context.js'
import {AsyncIterateEmitter} from './lib/asyncIterateEmitter.js'
import {headersToObject, objectToHeaders} from './lib/utils.js'
import {Router} from './router/router.js'

interface AppOptions {
  router?: Router
}

type ListenOptionsHttp = net.ListenOptions & {
  transport: 'http',
  server?: http.ServerOptions
}

type ListenOptionsHttps = net.ListenOptions & {
  transport: 'https',
  server: https.ServerOptions
}

type ListenOptionsH2c = net.ListenOptions & {
  transport: 'h2c',
  server?: http2.ServerOptions
}

type ListenOptionsH2 = net.ListenOptions & {
  transport: 'h2',
  server: http2.SecureServerOptions
}

export type ServerListenOptions =
  | ListenOptionsHttp
  | ListenOptionsHttps
  | ListenOptionsH2c
  | ListenOptionsH2

export class App {
  readonly router: Router

  constructor(options: AppOptions = {}) {
    this.router = options.router ?? new Router()
  }


  /!*  async listen(options: ServerListenOptions, listener?: () => void) {
      if (options.transport === 'http' || options.transport === 'https') {
        const iterateEmitter = new AsyncIterateEmitter<{
          request: http.IncomingMessage,
          response: http.ServerResponse
        }>()
        if (options.transport === 'http') {
          const server = http.createServer()
          server.on('request', (request, response) => iterateEmitter.emit({request, response}))
          server.once('close', () => iterateEmitter.destroy()) // last resolve
          server.listen(options, listener)
        }
        if (options.transport === 'https') {
          const server = https.createServer(options.server)
          server.on('request', (request, response) => iterateEmitter.emit({request, response}))
          server.once('close', () => iterateEmitter.destroy()) // last resolve
          server.listen(options, listener)
        }

        for await (const {request, response} of iterateEmitter) {
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
            console.log(url)
            response.writeHead(result.status, headersToObject(result.header))
            if (response.writable) response.end(result.body)
          } catch (e) {
            console.error(e)
            response.destroy()
          }
        }
      }
      if (options.transport === 'h2' || options.transport === 'h2c') {
        const iterateEmitter = new AsyncIterateEmitter<{
          stream: http2.ServerHttp2Stream,
          headers: http2.IncomingHttpHeaders
        }>()
        if (options.transport == 'h2') {
          const server = http2.createSecureServer(options.server)
          server.on('stream', (stream, headers) => iterateEmitter.emit({stream, headers}))
          server.once('close', () => iterateEmitter.destroy()) // last resolve
          server.listen(options, listener)
        }
        if (options.transport == 'h2c') {
          const server = http2.createServer(options.server)
          server.on('stream', (stream, headers) => iterateEmitter.emit({stream, headers}))
          server.once('close', () => iterateEmitter.destroy()) // last resolve
          server.listen(options, listener)
        }
      }
    }

    /!*async listen(options: ServerListenOptions) {
      const server = Server.listen(options)
  /!*    for await (const {request, response} of server) {
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
      }*!/
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
    }*!/

    async listen2(options: ServerListenOptions, listener?: () => void) {
      const iterateEmitter = new AsyncIterateEmitter<{
        request: http.IncomingMessage,
        response: http.ServerResponse
      }>()
      if (options.transport === 'http') {
        const server = http.createServer()
        server.on('request', (request, response) => iterateEmitter.emit({request, response}))
        server.once('close', () => iterateEmitter.destroy()) // last resolve
        server.listen(options, listener)

        for await (const {request, response} of iterateEmitter) {
          const headers = objectToHeaders(request.headers)
          const url = new URL(request.url, `http://${request.headers['host']}`)
          const ctx = new Context({
            method: request.method,
            url,
            headers,
            body: new Body(request, headers),
            onRespond: () => {
            }
          })

          // const result = await this.#handle(ctx)
          this.#iterator.emit(ctx)
          response.writeHead(result.status, headersToObject(result.header))
          if (response.writable) response.end(result.body)
        }
      }
    }

    async #handle(ctx: Context): Promise<ReturnType<typeof Context.Response>> {
      await Router.Exec(this.router, ctx).catch(reason => {
        if (reason instanceof HttpError) {
          return ctx.json({
            error: {
              status: reason.status,
              message: reason.expose ? reason.message : 'Server Error',
            },
          }, {
            status: reason.status,
            headers: reason.headers,
          })
        }

        ctx.respond(new Uint8Array(0), {status: 500})

        throw reason
      })

      const response = Context.Response(ctx)

      // compress response
      /!*if (response.compress) {
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
      }*!/

      // remove body
      if (ctx.method == 'HEAD') Context.Response(ctx).body = new Uint8Array(0)

      return response
    }*!/
}*/

//================================================
// const app = new App()
// app.listen({transport: 'http', port: 50000})
// for await (const ctx of app) {
//   ctx.respond('1')
// }
/*
interface HttpRequest {
  ctx: Context

  respondWith(data: any): void
}

class Test {
  private constructor() {
  }

  static listen() {
    const server = http.createServer()
    server.listen(50000)

    return {
      async* [Symbol.asyncIterator](): AsyncIterator<HttpRequest> {
        while (server.listening) yield await new Promise(resolve => {
          server.once('request', async (request, response) => {
            const url = new URL(request.url, `http://${request.headers['host']}`)
            const headers = objectToHeaders(request.headers)
            const ctx = new Context({
              method: request.method,
              url,
              headers,
              body: new Body(request, headers),
            })

            resolve({
              ctx,
              respondWith(context: Context) {
                const result = Context.Response(ctx)
                response.writeHead(result.status, headersToObject(result.header))
                if (response.writable) response.end(result.body)
              },
            })
          })
        })
      },
    }
  }
}

const listen = Test.listen()
for await (const {ctx, respondWith} of listen) {
  // console.log(await ctx.body.text())
  ctx.text('321312')

  respondWith(ctx)
}
*/
