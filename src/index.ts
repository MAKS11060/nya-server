import http from 'http'
import http2 from 'http2'
import https from 'https'
import {TLSSocket} from 'tls'
import Router from './components/router.js'
import {Handler} from './handler.js'
import {BodyOptions} from './components/body.js'

export * from './module/spa.js'
export * from './module/h2-websocket.js'

type AppUtilitiesOptions = {
	forceHTTPS?: boolean
}

export type AppOptions = Partial<AppUtilitiesOptions & BodyOptions>

export class App {
	options: AppOptions = {
		maxBodySize: 1024 * 1024
	}

	private _handler: Handler

	constructor(options?: AppOptions) {
		Object.assign(this.options, options)

		Object.defineProperty(this, '_router', {value: new Router, enumerable: false})
		Object.defineProperty(this, '_handler', {value: new Handler(this), enumerable: false})

		this.router.use(ctx => {
			if (this.options?.forceHTTPS && !ctx.encrypted) {
				ctx.status(301)
				ctx.uri.protocol = 'https'
				ctx.header.location = ctx.uri.toString()
				ctx.send()
			}
		})
	}

	private _router: Router

	get router(): Router {
		return this._router
	}

	set router(router: Router) {
		this._router.use(router)
	}

	get app(): this {
		return this
	}

	get requestListener(): http.RequestListener {
		return (req: http.IncomingMessage, res: http.ServerResponse) => {
			// console.log(req.httpVersion)
			if (req.httpVersionMajor == 1) { // Only 1.x http version
				this._handler.httpRequest(req, res)
				return
			}
			res.destroy(new Error(`http version is not supported (${req.httpVersion})`))
			res.end('')
		}
	}

	get onStream(): (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, flags: number) => void {
		return (stream, headers, flags) => {
			this._handler.streamRequest(stream, headers, flags)
			// stream.end('h2')
		}
	}

	get onUnknownProtocol(): (socket: TLSSocket) => void {
		return socket => {
			// if connected not ALPN h2
			if (!socket.alpnProtocol) socket.destroy()
		}
	}

	static Router(): Router {
		return new Router
	}

	static create() {
		return new this
	}
}

export class Server {
	static HTTP(app: App): http.Server {
		return http.createServer(app.requestListener)
	}

	static HTTPS(app: App, options: https.ServerOptions): https.Server {
		return https.createServer(options, app.requestListener)
	}

	static HTTP2(app: App, options: http2.SecureServerOptions): http2.Http2SecureServer {
		return http2.createSecureServer({settings: {enableConnectProtocol: true /*ws on http2*/}, ...options})
			.on('stream', app.onStream)
			.on('unknownProtocol', app.onUnknownProtocol)
	}
}
