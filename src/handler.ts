import http from 'http'
import http2 from 'http2'
import {Context, ContextHTTP, ContextHTTP2} from './context.js'
import {App} from './index.js'

export class Handler {
	app: App

	constructor(app: App) {
		this.app = app
	}

	httpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
		const context = new Context(this.app, new ContextHTTP(req, res))
		this.app.router.middleware()(context)
			.then(() => context.send())
	}

	streamRequest(stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, flags: number): void {
		const context = new Context(this.app, new ContextHTTP2(stream, headers))
		this.app.router.middleware()(context)
			.then(() => context.send())
	}
}
