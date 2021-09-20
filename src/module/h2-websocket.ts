import WS from 'ws'
import {Context} from '../context.js'
import {TypedEmitter} from 'tiny-typed-emitter'

type WebSocketClientEvents = {
	close: (socket: WebSocketClient, ctx: Context) => void
	error: (error: Error) => void
	message: (data: string | Buffer, binary: boolean) => void
}

type WebSocketEvents = {
	connect: (socket: WebSocketClient, ctx: Context) => void
	close: (socket: WebSocketClient, ctx: Context) => void
}

class WebSocketClient extends TypedEmitter<WebSocketClientEvents> {
	private ws: any
	ctx: Context

	constructor(ctx: Context & { stream: { setNoDelay?: Function } }, options?: { maxPayload: number; skipUTF8Validation?: number }) {
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

export class H2Websocket extends TypedEmitter<WebSocketEvents> {
	readonly clients: Set<WebSocketClient> = new Set

	middleware(options?: { maxPayload?: number; skipUTF8Validation?: number; validateWebSocket?: boolean }): (ctx: Context) => any {
		return ctx => {
			if (options.validateWebSocket) {
				if (ctx.headers[':protocol'] !== 'websocket') throw new Error('Headers[:protocol] not valid')
				if (!ctx.headers.origin) throw new Error('Headers[origin] is undefined')
			}

			ctx.url.protocol = ctx.url.protocol === 'https:' ? 'wss' : 'ws'
			ctx.autoClose = false
			ctx.respond()

			const socket = new WebSocketClient(ctx, {maxPayload: 100 * 1024 * 1024, ...options})
			this.clients.add(socket)

			this.emit('connect', socket, ctx)

			socket.once('close', socket => {
				this.clients.delete(socket)
				this.emit('close', socket, ctx)
			})
		}
	}

	send(data: string | Buffer) {
		for (const client of this.clients) {
			client.send(data)
		}
	}
}
