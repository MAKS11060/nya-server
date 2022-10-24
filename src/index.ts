import {readFileSync} from 'fs'
import http from 'http'
import http2 from 'http2'
import https from 'https'
import {Route} from './core/Route.js'
import {Router} from './core/Router.js'
import {AppConfig} from './core/types.js'
import {WebSocketH2, WebSocketOption} from './module/WebSocket.js'

export {Route} from './core/Route.js'
export {ContentType} from './core/types.js'
export {HTTPError} from './core/HTTPError.js'

export class App {
	private router: Router
	private server: http2.Http2SecureServer | http.Server | https.Server | undefined

	constructor(readonly config: AppConfig) {
		this.router = new Router(this)

		if (config.http == 'h2') {
			this.server = http2.createSecureServer({
				settings: {...config.settings},
				...config.options,
				key: config.key && readFileSync(config.key) || config.options?.key,
				cert: config.cert && readFileSync(config.cert) || config.options?.cert,
				ca: config.ca && readFileSync(config.ca) || config.options?.ca,
			})
			this.server.on('stream', this.router.http2Stream)
			this.server.on('unknownProtocol', socket => {
				// if connected not ALPN h2
				if (!socket.alpnProtocol) socket.destroy()
			})
		}

		if (config.http == 'http') {
			this.server = http.createServer()
			this.server.on('request', this.router.request)
		}

		if (config.http == 'https') {
			this.server = https.createServer({
				...config.options,
				key: config.key && readFileSync(config.key) || config.options?.key,
				cert: config.cert && readFileSync(config.cert) || config.options?.cert,
				ca: config.ca && readFileSync(config.ca) || config.options?.ca,
			})
			this.server.on('request', this.router.request)
		}
		
		if (undefined == config.log) {
			config.log = 'error'
		}
	}

	get app(): App {
		return this
	}

	get route(): Route {
		return this.router.route
	}

	static Route(): Route {
		return new Route()
	}

	static WebSocket(option?: WebSocketOption): WebSocketH2 {
		return new WebSocketH2(option)
	}

	listen(port: number, host?: string) {
		this.server?.listen(port, host)
		return this
	}
}
