import http from 'http'
import http2 from 'http2'
import https from 'https'
import net from 'net'
import {AsyncIterateEmitter} from './lib/asyncIterateEmitter.js'

export class Server {
  static listen(options: net.ListenOptions, listener?: () => void) {
    const server = http.createServer()
    const iterateEmitter = new AsyncIterateEmitter<{ request: http.IncomingMessage, response: http.ServerResponse }>()
    server.on('request', (request, response) => iterateEmitter.emit({request, response}))
    server.once('close', () => iterateEmitter.destroy()) // last resolve
    server.listen(options, listener)
    // return iterateEmitter
    return {
      server,
      [Symbol.asyncIterator]: iterateEmitter[Symbol.asyncIterator].bind(iterateEmitter),
    }
  }

  static listenTls(options: https.ServerOptions & net.ListenOptions, listener?: () => void) {
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

  /** http2.createSecureServer */
  static listenH2(options: http2.SecureServerOptions & net.ListenOptions, listener?: () => void) {
    const server = http2.createSecureServer(options)
    server.listen(options, listener)
    return {
      async* [Symbol.asyncIterator](): AsyncIterator<{ stream: http2.ServerHttp2Stream; headers: http2.IncomingHttpHeaders }> {
        while (server.listening) yield await new Promise(resolve => {
          server.once('stream', (stream, headers) => resolve({stream, headers}))
        })
      },
    }
  }

  /** http2.createServer */
  static listenH2C(options: http2.ServerOptions & net.ListenOptions, listener?: () => void) {
    const server = http2.createServer(options)
    const iterateEmitter = new AsyncIterateEmitter<{ stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders }>()

    server.on('stream', (stream, headers) => iterateEmitter.emit({stream, headers}))
    server.once('close', () => iterateEmitter.destroy()) // last resolve
    server.listen(options, listener)
    // return iterateEmitter
    return {
      server,
      [Symbol.asyncIterator]: iterateEmitter[Symbol.asyncIterator].bind(iterateEmitter),
    }
  }
}
