import http from 'http'
import http2 from 'http2'
import https from 'https'
import type net from 'net'
import {h2respondWith, h2streamToWeb, requestToWeb, respondWith} from './lib/node-web.js'

type ListenOptionsHttp = net.ListenOptions & {
  transport?: 'http',
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

type ServerType<T = ServerListenOptions> =
  T extends ListenOptionsHttp
    ? http.Server
    : T extends ListenOptionsHttps
      ? https.Server
      : T extends ListenOptionsH2
        ? http2.Http2SecureServer
        : T extends ListenOptionsH2c
          ? http2.Http2Server
          : never

export class Server {
  /**
   * @example
   * const app = new App()
   * Server.listen(app.fetch, {transport: 'http', port: 50000})
   * // or
   * Server.listen(request => new Response('321'), {transport: 'http', port: 50000})
   * */
  static listen<T extends ServerListenOptions>(handle: (request: Request) => Response | Promise<Response>, options: T, listener?: () => void): ServerType<T> {
    // default http server
    if (!options.transport) options.transport = 'http'

    if (options.transport === 'http') {
      const server = http.createServer(options.server)
      server.listen(options, listener)
      server.on('request', async (req, res) => {
        const request = requestToWeb(req)
        respondWith(res, await handle(request))
      })
      return server as any
    }

    if (options.transport === 'https') {
      const server = https.createServer(options.server)
      server.listen(options, listener)
      server.on('request', async (req, res) => {
        const request = requestToWeb(req)
        respondWith(res, await handle(request))
      })
      return server as any
    }

    if (options.transport === 'h2c') {
      const server = http2.createServer(options.server)
      server.listen(options, listener)
      server.on('stream', async (stream, headers) => {
        const request = h2streamToWeb(stream, headers)
        h2respondWith(stream, await handle(request))
      })
      return server as any
    }

    if (options.transport === 'h2') {
      const server = http2.createSecureServer(options.server)
      server.listen(options, listener)
      server.on('stream', async (stream, headers) => {
        const request = h2streamToWeb(stream, headers)
        h2respondWith(stream, await handle(request))
      })
      return server as any
    }
  }
}
