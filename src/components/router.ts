import {parse} from 'regexparam'
import {Context, Middleware} from '../context.js'


const exec = (path: string, result: { keys: string[], pattern: RegExp }): { [key: string]: string | null } => {
	let i = 0, out = {}
	let matches = result.pattern.exec(path)
	while (i < result.keys.length) {
		out[result.keys[i]] = decodeURI(matches[++i]) || null
	}
	return out
}

type IRoute = {
	uri: string
	method: string
	handler: (ctx: Context) => unknown
	uriParams?: { keys: string[], pattern: RegExp }
}

interface IRouter {
	store: {
		middleware?: Middleware[]
		routes?: IRoute[]
	}

	use(handler: Middleware): this

	all(uri: string, handler: (ctx: Context) => unknown): this

	get(uri: string, handler: (ctx: Context) => unknown): this

	put(uri: string, handler: (ctx: Context) => unknown): this

	post(uri: string, handler: (ctx: Context) => unknown): this

	head(uri: string, handler: (ctx: Context) => unknown): this

	trace(uri: string, handler: (ctx: Context) => unknown): this

	patch(uri: string, handler: (ctx: Context) => unknown): this

	delete(uri: string, handler: (ctx: Context) => unknown): this

	options(uri: string, handler: (ctx: Context) => unknown): this

	connect(uri: string, handler: (ctx: Context) => unknown): this
}

export default class Router implements IRouter {
	store: {
		middleware?: Middleware[]
		routes?: IRoute[]
	}

	constructor() {
		this.store = {}
	}

	static create() {
		return new this()
	}

	static createRoute(router: IRouter, route: IRoute) {
		const {store} = router

		route.method = route.method.toUpperCase()
		route.uriParams = parse(route.uri)

		store.routes = [...store.routes || [], route]
	}

	static createMiddleware(router: IRouter, handler: Middleware | Router) {
		const {store} = router

		if (typeof handler === 'function') {
			store.middleware = [...store.middleware || [], handler]
		} else if (handler instanceof Router) {
			store.middleware = [...store.middleware || [], handler.middleware()]
		}
	}

	static find(router: IRouter, method: string, uri: string) {
		method = method.toUpperCase()
		return (router.store.routes || [])
			.filter(route => (route.method === method || route.method === '*') && route.uriParams.pattern.test(uri))
			.map((route: IRoute) => ({
				uri: route.uri ? route.uri : null,
				params: route.uri ? new Map(Object.entries(exec(uri, route.uriParams))) : null,
				handler: route.handler
			}))
	}

	middleware() {
		return async (ctx: Context): Promise<void> => {
			try {
				for (const handler of this.store.middleware || []) {
					if (ctx.stream.writable) await handler(ctx)
				}

				for (const route of Router.find(this, ctx.method, ctx.uri.pathname)) {
					if (ctx.isSent) return
					ctx.params = route.params
					ctx.next = await route.handler(ctx) || undefined
				}
			} catch (e) {
				throw e
			}
		}
	}

	use(handler: Middleware | this) {
		Router.createMiddleware(this, handler)
		return this
	}

	all(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: '*', handler})
		return this
	}

	get(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'GET', handler})
		return this
	}

	post(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'POST', handler})
		return this
	}

	put(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'PUT', handler})
		return this
	}

	head(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'HEAD', handler})
		return this
	}

	delete(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'DELETE', handler})
		return this
	}

	options(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'OPTIONS', handler})
		return this
	}

	connect(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'CONNECT', handler})
		return this
	}

	trace(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'TRACE', handler})
		return this
	}

	patch(uri: string, handler: (ctx: Context) => unknown) {
		Router.createRoute(this, {uri, method: 'PATCH', handler})
		return this
	}
}
