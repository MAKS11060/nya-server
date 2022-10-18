// @ts-nocheck
import WS from 'ws'
import {Context, ContextHTTP1, ContextHTTP2} from '../core/Context.js'
import {HTTPError} from '../core/HTTPError.js'
import {Flatten, RouteParams} from '../core/types.js'

export interface WebSocketOption {
	maxPayload?: number
	skipUTF8Validation?: number
	validateWebSocket?: boolean
}

export class WebSocketH2 {
	readonly connects: Set<WS.WebSocket> = new Set()

	constructor(readonly option?: WebSocketOption) {
	}

	link(ctx: Context<Flatten<'CONNECT'>, RouteParams<string>>): WS.WebSocket {
		const bCtx = Context.getBaseContext(ctx)
		if (bCtx instanceof ContextHTTP2) {
			// check is WebSocket connection
			if (this.option?.validateWebSocket) {
				if (ctx.headers[':protocol'] != 'websocket') throw new HTTPError('Bad Request')
				if (!ctx.headers['origin']) throw new HTTPError('Bad Request', 'Set Header: origin')
			}

			// replace http to ws schema
			ctx.uri.protocol = ctx.uri.protocol == 'https:' ? 'wss:' : 'ws:'
			ctx.send('', true) // prevent close stream

			// create WebSocket
			const soc = new WS(null, {})
			soc.on('open', () => {
				console.log('open')
				this.connects.add(soc)
			})
			soc.on('error', console.error)
			soc.on('close', (code, reason) => {
				console.log('close', code, reason)
				this.connects.delete(soc)
			})
			soc.on('message', (data, isBinary) => {
				if (!isBinary) console.log('msg', data.toString())
				else console.log('msg bin', data)
			})

			bCtx.stream.setNoDelay = () => null // using in internal ws code
			soc.setSocket(bCtx.stream, ctx.headers, {maxPayload: 100 * 1024 * 1024, ...this.option})

			return soc
		}

		if (bCtx instanceof ContextHTTP1) {
			console.log('http 1.1')
		}
	}

	sendAll(data: string) {
		for (let connect of this.connects) {
			connect.send(data)
		}
	}
}
