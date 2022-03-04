import {App} from './app.js'
import http from 'http'
import http2 from 'http2'
import {Context, Method} from './context.js'
import {TLSSocket} from 'tls'

export type Handle<M extends Method = Method, P extends string = string> = (ctx: Context<M, P>) => void

export const createHandler = (handle: Handle): Handle => handle

export class Handler {
	private readonly app: App
	private readonly stack: Handle[] = []

	constructor(app: App) {
		this.app = app
	}

	get requestListener(): http.RequestListener {
		return (req: http.IncomingMessage, res: http.ServerResponse) => {
			if (req.httpVersionMajor == 1) { // Only 1.x http version
				const context = Context.HTTP(this.app, req, res)
				this.request(context)
				return
			}
			res.destroy(new Error(`http version is not supported (${req.httpVersion})`))
			res.end('')
		}
	}

	get onStream(): (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, flags: number) => void {
		return (stream, headers) => {
			const context = Context.HTTP2(this.app, stream, headers)
			this.request(context)
		}
	}

	get onUnknownProtocol(): (socket: TLSSocket) => void {
		return socket => {
			// if connected not ALPN h2
			if (!socket.alpnProtocol) socket.destroy()
		}
	}

	registerHandler(handler: Handle) {
		this.stack.push(handler)
	}

	private async request(ctx: Context) {
		for (const handler of this.stack) {
			await handler(ctx)
		}
		ctx.send()
	}
}
