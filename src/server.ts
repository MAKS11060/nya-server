import http from 'http'
import http2 from 'http2'
import https from 'https'
import type net from 'net'
import {HttpError} from './httpError.js'
import {headersToObject, objectToHeaders} from './lib/utils.js'

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

interface HttpRequest {
  /*request: {
    method: string
    url: URL
    headers: Headers
    body: Body
  }*/
  /*  respondWith(data: {
      body?: string | ArrayBuffer | Uint8Array
      headers?: Headers
      status?: number
    }): void*/

  request: Request

  respondWith(response: Response): void
}

function getRawBody(req: http.IncomingMessage, body_size_limit?: number): ReadableStream | null {
  const h = req.headers

  if (!h['content-type']) {
    return null
  }

  const content_length = Number(h['content-length'])

  // check if no request body
  if ((req.httpVersionMajor === 1 && isNaN(content_length) && h['transfer-encoding'] == null) ||
    content_length === 0
  ) return null

  let length = content_length

  if (body_size_limit) {
    if (!length) {
      length = body_size_limit
    } else if (length > body_size_limit) {
      throw new HttpError('RequestEntityTooLarge', {
        cause: `Received content-length of ${length}, but only accept up to ${body_size_limit} bytes.`,
      })
    }
  }

  if (req.destroyed) {
    const readable = new ReadableStream()
    readable.cancel()
    return readable
  }

  let size = 0
  let cancelled = false

  return new ReadableStream({
    start(controller) {
      req.on('error', (error) => {
        cancelled = true
        controller.error(error)
      })

      req.on('end', () => {
        if (cancelled) return
        controller.close()
      })

      req.on('data', (chunk) => {
        if (cancelled) return

        size += chunk.length
        if (size > length) {
          cancelled = true
          controller.error(
            new HttpError('RequestEntityTooLarge', {
              cause: `request body size exceeded ${
                content_length ? '\'content-length\'' : 'BODY_SIZE_LIMIT'} of ${length}`,
            }),
          )
          return
        }

        controller.enqueue(chunk)

        if (controller.desiredSize === null || controller.desiredSize <= 0) {
          req.pause()
        }
      })
    },

    pull() {
      req.resume()
    },

    cancel(reason) {
      cancelled = true
      req.destroy(reason)
    },
  })
}

export class Server {
  static listen(options: net.ListenOptions) {
    const server = http.createServer()
    server.listen(options)

    return {
      async* [Symbol.asyncIterator](): AsyncIterator<HttpRequest> {
        while (server.listening) yield await new Promise(resolve => {
          server.once('request', async (req, res) => {
            const url = new URL(req.url, `http://${req.headers['host']}`)
            const headers = objectToHeaders(req.headers)

            const r = new Request(url, {
              // @ts-ignore
              duplex: 'half',
              // body: getRawBody(req),
              method: req.method,
              headers,
            })

            resolve({
              /*request: {
                method: request.method,
                url,
                headers,
                // body: new Body(request, headers),
              },*/
              /*respondWith(res) {
                response.writeHead(res?.status ?? 200, headersToObject(res.headers))
                if (response.writable) response.end(res.body)
              },*/

              request: r,
              async respondWith(response: Response) {
                res.writeHead(response.status, headersToObject(response.headers))
                if (!response.body) {
                  res.end()
                  return
                }

                res.end(new Uint8Array(await response.arrayBuffer()))

                /*res.writeHead(response.status, headersToObject(response.headers))

                if (!response.body) {
                  res.end()
                  return
                }

                if (response.body.locked) {
                  res.write(
                    'Fatal error: Response body is locked. ' +
                    `This can happen when the response was already read (for example through 'response.json()' or 'response.text()').`,
                  )
                  res.end()
                  return
                }

                const reader = response.body.getReader()

                if (res.destroyed) {
                  reader.cancel()
                  return
                }

                const cancel = (error?: Error) => {
                  res.off('close', cancel)
                  res.off('error', cancel)

                  // If the reader has already been interrupted with an error earlier,
                  // then it will appear here, it is useless, but it needs to be catch.
                  reader.cancel(error).catch(() => {
                  })
                  if (error) res.destroy(error)
                }

                res.on('close', cancel)
                res.on('error', cancel)

                next()

                async function next() {
                  try {
                    for (; ;) {
                      const {done, value} = await reader.read()

                      if (done) break

                      if (!res.write(value)) {
                        res.once('drain', next)
                        return
                      }
                    }
                    res.end()
                  } catch (error) {
                    cancel(error instanceof Error ? error : new Error(String(error)))
                  }
                }*/
              },
            })
          })
        })
      },
    }
  }
}


/*type ListenOptionsHttp = net.ListenOptions & {
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

export class Server {
  static listen(options: ListenOptionsHttp, listener?: () => void): AsyncIterateEmitter<{
    request: http.IncomingMessage,
    response: http.ServerResponse
  }>
  static listen(options: ListenOptionsHttps, listener?: () => void): AsyncIterateEmitter<{
    request: http.IncomingMessage,
    response: http.ServerResponse
  }>
  static listen(options: ListenOptionsH2c, listener?: () => void): AsyncIterateEmitter<{
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders
  }>
  static listen(options: ListenOptionsH2, listener?: () => void): AsyncIterateEmitter<{
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders
  }>
  static listen(options: ServerListenOptions, listener?: () => void) {
    if (options.transport === 'http') {
      const server = http.createServer()
      const iterateEmitter = new AsyncIterateEmitter<{
        request: http.IncomingMessage,
        response: http.ServerResponse
      }>()
      server.on('request', (request, response) => iterateEmitter.emit({request, response}))
      server.once('close', () => iterateEmitter.destroy()) // last resolve
      server.listen(options, listener)
      return iterateEmitter
    }
    if (options.transport === 'https') {
      const server = https.createServer(options.server)
      const iterateEmitter = new AsyncIterateEmitter<{
        request: http.IncomingMessage,
        response: http.ServerResponse
      }>()
      server.on('request', (request, response) => iterateEmitter.emit({request, response}))
      server.once('close', () => iterateEmitter.destroy()) // last resolve
      server.listen(options, listener)
      return iterateEmitter
    }
    if (options.transport === 'h2c') {
      const server = http2.createServer(options.server)
      const iterateEmitter = new AsyncIterateEmitter<{
        stream: http2.ServerHttp2Stream,
        headers: http2.IncomingHttpHeaders
      }>()

      server.on('stream', (stream, headers) => iterateEmitter.emit({stream, headers}))
      server.once('close', () => iterateEmitter.destroy()) // last resolve
      server.listen(options, listener)
      return iterateEmitter
      // return {
      //   server,
      //   [Symbol.asyncIterator]: iterateEmitter[Symbol.asyncIterator].bind(iterateEmitter),
      // }
    }
    if (options.transport === 'h2') {
      const server = http2.createSecureServer(options.server)
      const iterateEmitter = new AsyncIterateEmitter<{
        stream: http2.ServerHttp2Stream,
        headers: http2.IncomingHttpHeaders
      }>()

      server.on('stream', (stream, headers) => iterateEmitter.emit({stream, headers}))
      server.once('close', () => iterateEmitter.destroy()) // last resolve
      server.listen(options, listener)

      return iterateEmitter

      /!*server.listen(options, listener)
      return {
        async* [Symbol.asyncIterator](): AsyncIterator<{ stream: http2.ServerHttp2Stream; headers: http2.IncomingHttpHeaders }> {
          while (server.listening) yield await new Promise(resolve => {
            server.once('stream', (stream, headers) => resolve({stream, headers}))
          })
        },
      }*!/
    }
  }

/!*
  // static listen(options: net.ListenOptions, listener: () => void) {
  //   const server = http.createServer()
  //   const iterateEmitter = new AsyncIterateEmitter<{ request: http.IncomingMessage, response: http.ServerResponse }>()
  //   server.on('request', (request, response) => iterateEmitter.emit({request, response}))
  //   server.once('close', () => iterateEmitter.destroy()) // last resolve
  //   server.listen(options, listener)
  //
  //   // return iterateEmitter
  //   return {
  //     [Symbol.asyncIterator]: iterateEmitter[Symbol.asyncIterator].bind(iterateEmitter),
  //     server,
  //   }
  // }

  static listenTls(options: https.ServerOptions & net.ListenOptions, listener: () => void) {
    const server = https.createServer(options)
    server.listen(options, listener)
    return {
      async* [Symbol.asyncIterator](): AsyncIterator<{ request: http.IncomingMessage; response: http.ServerResponse }> {
        while (server.listening) yield await new Promise(resolve => {
          server.once('request', (request, response) => resolve({request, response}))
        })
      },
    }
  }

  /!** http2.createServer *!/
  static listenH2C(options: http2.ServerOptions & net.ListenOptions, listener: () => void) {
    const server = http2.createServer(options)
    const iterateEmitter = new AsyncIterateEmitter<{
      stream: http2.ServerHttp2Stream,
      headers: http2.IncomingHttpHeaders
    }>()

    server.on('stream', (stream, headers) => iterateEmitter.emit({stream, headers}))
    server.once('close', () => iterateEmitter.destroy()) // last resolve
    server.listen(options, listener)
    // return iterateEmitter
    return {
      server,
      [Symbol.asyncIterator]: iterateEmitter[Symbol.asyncIterator].bind(iterateEmitter),
    }
  }

  /!** http2.createSecureServer *!/
  static listenH2(options: http2.SecureServerOptions & net.ListenOptions, listener: () => void) {
    const server = http2.createSecureServer(options)
    server.listen(options, listener)
    return {
      async* [Symbol.asyncIterator](): AsyncIterator<{
        stream: http2.ServerHttp2Stream;
        headers: http2.IncomingHttpHeaders
      }> {
        while (server.listening) yield await new Promise(resolve => {
          server.once('stream', (stream, headers) => resolve({stream, headers}))
        })
      },
    }
  }
  *!/
}*/


/*const l = Server.listen({transport: 'h2c'})
for await (const r of l) {

}*/

/*
const listen = Server.listen({
  transport: 'https',
  // port: 50000,
  // server: {
  //   settings: {
  //     enableConnectProtocol: true,
  //   },
  // },
})
for await (const {stream, headers} of listen) {
  stream.end('')
}
*/
