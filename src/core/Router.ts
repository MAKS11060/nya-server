import {IncomingMessage, ServerResponse} from 'http'
import {Http2ServerRequest, Http2ServerResponse, IncomingHttpHeaders, ServerHttp2Stream} from 'http2'
import {RouteParams} from 'regexparam'
import {App} from '../index.js'
import {Context, ContextHTTP1, ContextHTTP2} from './Context.js'
import {HTTPError} from './HTTPError.js'
import {Route} from './Route.js'
import {HTTPMethod} from './types.js'

export class Router {
	readonly route: Route

	constructor(readonly app: App) {
		this.route = new Route()

		Object.defineProperties(this, {
			request: {value: this.request.bind(this)},
			http2Stream: {value: this.http2Stream.bind(this)},
		})
	}

	async request(req: IncomingMessage | Http2ServerRequest, res: ServerResponse | Http2ServerResponse) {
		try {
			if (req instanceof Http2ServerRequest || res instanceof Http2ServerResponse) return
			const contextHTTP1 = new ContextHTTP1(req, res)
			const context = new Context(contextHTTP1)

			await this.handler(context)
		} catch (e) {
			console.error('request error', e)
			res.destroy(new Error('unknown err'))
		}
	}

	async http2Stream(stream: ServerHttp2Stream, headers: IncomingHttpHeaders) {
		try {
			const contextHTTP2 = new ContextHTTP2(stream, headers)
			const context = new Context(contextHTTP2)

			await this.handler(context)
		} catch (e) {
			console.error('request error', e)
			stream.destroy(new Error('stream unknown err'))
		}
	}

	private async handler(ctx: Context<HTTPMethod, RouteParams<string>>) {
		try {
			/* Route handler */
			for (const handle of Route.getMiddleware(this.route)) {
				// if (!context.isSent) await handle(context)
				let response = await handle(ctx)

				// if empty response
				if (undefined !== response) return ctx.send(response)
			}

			for (const route of Route.find(this.route, ctx.method, ctx.uri.pathname)) {
				Object.defineProperties(ctx, {
					params: {get: () => route.params},
				})

				let response = await route.handler(ctx)

				// if response not undefined
				if (undefined !== response) return ctx.send(response)
			}

			await ctx.send()
		} catch (e) {
			// console.error('handler err:', e)
			if (e instanceof HTTPError) {
				ctx.status(e.statusCode)
				ctx.send(e.message)
				return
			}
			if (this.app.config.log) {
				if (this.app.config.log == 'error') {
					console.error(e)
				}
			}
			ctx.status(500).send('unknown error')
		}
	}
}
