import {Handler} from './handler.js'
import {Router, routerHandler} from './router.js'
import {BodyOptions} from './body.js'

type AppOptions = {
	forceHTTPS: boolean
	logRequests: boolean
} & BodyOptions

export class App {
	readonly options: AppOptions
	readonly handler: Handler

	private readonly _router: Router

	constructor(options?: Partial<AppOptions>) {
		this.options = Object.assign({
			forceHTTPS: false,
			logRequests: false,
			bodySize: 1024 * 1024,
		}, options)

		Object.defineProperty(this, 'handler', {writable: false, enumerable: false, value: new Handler(this)})
		Object.defineProperty(this, '_router', {writable: false, enumerable: false, value: new Router()})

		this.handler.registerHandler(ctx => {
			if (this.options?.forceHTTPS && !ctx.encrypted) {
				ctx.status(301)
				ctx.uri.protocol = 'https'
				ctx.header.location = ctx.uri.toString()
				ctx.send()
			}

			if (this.options?.logRequests) {
				console.log(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ${ctx.method} ${ctx.pathname}`)
			}
		})
		this.handler.registerHandler(routerHandler(this.router))
	}

	get app(): App {
		return this
	}

	get router(): Router {
		return this._router
	}
}
