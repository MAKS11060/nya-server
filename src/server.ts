import http from 'http'
import https from 'https'
import h2, {Http2SecureServer, SecureServerOptions} from 'http2'
import {Context} from './context.js'
import {App} from './index.js'


export class ServerHTTP {
	private readonly _server: http.Server

	constructor(options?: http.ServerOptions) {
		this._server = http.createServer(options)
	}

	get server(): http.Server {
		return this._server
	}

	use<T>(app: T): T {
		return app
	}

	listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void) {
		this.server.listen(port, hostname, backlog, listeningListener)
	}
}

export class ServerHTTPS {
	private readonly _server: https.Server

	constructor(options?: https.ServerOptions) {
		this._server = https.createServer(options)
	}


	get server(): https.Server {
		return this._server
	}

	use<T>(app: T): T {
		return app
	}

	listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void) {
		this.server.listen(port, hostname, backlog, listeningListener)
	}
}

export class ServerHTTP2 {
	private readonly _server: Http2SecureServer

	constructor(options?: SecureServerOptions) {
		this._server = h2.createSecureServer(options)
	}

	get server(): Http2SecureServer {
		return this._server
	}

	use(app: App) {
		this.server.on('stream', async (stream, headers) => {
			const context = Context.create(stream, headers)
			await app.handler.run(context)
			context.send()
		})

		return app
	}

	listen(port?: number, hostname?: string, backlog?: number, listeningListener?: () => void) {
		this.server.listen(port, hostname, backlog, listeningListener)
	}
}

export type Servers = ServerHTTP | ServerHTTPS | ServerHTTP2

export class Server {
	static createHTTP(options: http.ServerOptions): ServerHTTP {
		return new ServerHTTP(options)
	}

	static createHTTPS(options: https.ServerOptions): ServerHTTPS {
		return new ServerHTTPS(options)
	}

	static createHTTP2(options?: SecureServerOptions): ServerHTTP2 {
		return new ServerHTTP2(options)
	}
}
