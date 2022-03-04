import WS from 'ws'
import {Context} from '../core/context.js'
import {TypedEmitter} from 'tiny-typed-emitter'
import {Handle} from '../core/handler.js'

type WebSocketClientEvents = {
	close: (socket: WebSocketClient, ctx: Context) => void
	error: (error: Error) => void
	message: (data: string | Buffer, binary: boolean) => void
}

type WSClientContext = Context & { stream: { setNoDelay?: Function } }

type WSClientOptions = {
	maxPayload: number
	skipUTF8Validation?: number
}

export class WebSocketClient extends TypedEmitter<WebSocketClientEvents> {
	ctx: Context

	private ws: any

	constructor(ctx: WSClientContext, options: WSClientOptions) {
		super()
		this.ctx = ctx
		ctx.stream.setNoDelay = () => null
		const ws = this.ws = new WS(null)

		ws.on('close', () => this.emit('close', this, ctx))
		ws.on('message', (data, binary) => this.emit('message', data, binary))
		ws.on('error', err => this.emit('error', err))

		ws.setSocket(ctx.stream, ctx.headers, options) // internal method in WS
	}

	get readyState(): number {
		return this.ws.readyState
	}

	close(code: number, reason?: string | Buffer) {
		this.ws.close(code, reason)
	}

	send(data: string | Buffer | { [key: string]: any }, binary?: boolean) {
		this.ws.send(data, {binary})
	}

	ping(data: string | Buffer) {
		this.ws.ping(data)
	}

	pong(data: string | Buffer) {
		this.ws.pong(data)
	}
}

type H2WebSocketEvents = {
	connect: (socket: WebSocketClient, ctx: Context) => void
	close: (socket: WebSocketClient, ctx: Context) => void
}

type H2WebSocketOptions = {
	maxPayload?: number
	skipUTF8Validation?: number
	validateWebSocket?: boolean
}

export class H2Websocket extends TypedEmitter<H2WebSocketEvents> {
	readonly clients: Set<WebSocketClient> = new Set

	middleware(options?: H2WebSocketOptions): Handle {
		return ctx => {
			if (options?.validateWebSocket) {
				if (ctx.headers[':protocol'] !== 'websocket') throw new Error('Headers[:protocol] not valid')
				if (!ctx.headers.origin) throw new Error('Headers[origin] is undefined')
			}

			ctx.uri.protocol = ctx.uri.protocol === 'https:' ? 'wss' : 'ws'
			ctx.respond().send(null, true)

			const socket = new WebSocketClient(ctx, {maxPayload: 100 * 1024 * 1024, ...options})
			this.clients.add(socket)

			this.emit('connect', socket, ctx)

			socket.once('close', socket => {
				this.clients.delete(socket)
				this.emit('close', socket, ctx)
			})
		}
	}

	send(...data: Parameters<WebSocketClient['send']>) {
		for (const client of this.clients) {
			client.send(...data)
		}
	}

	[Symbol.iterator](): IterableIterator<WebSocketClient> {
		return this.clients.values()
	}
}
