import {parse} from 'regexparam'
import {IContext} from '../context.js'


const exec = (path: string, result: { keys: string[], pattern: RegExp }): {[key: string]: string | null} => {
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
	handler: (ctx: IContext) => unknown
	uriParams?: { keys: string[], pattern: RegExp }
}

type IMiddleware = (ctx: IContext) => void

interface IRouter {
	store: {
		middleware?: IMiddleware[]
		routes?: IRoute[]
	}

	use(handler: IMiddleware): this
	all(uri: string, handler: (ctx: IContext) => unknown): this
	get(uri: string, handler: (ctx: IContext) => unknown): this
	put(uri: string, handler: (ctx: IContext) => unknown): this
	post(uri: string, handler: (ctx: IContext) => unknown): this
	head(uri: string, handler: (ctx: IContext) => unknown): this
	trace(uri: string, handler: (ctx: IContext) => unknown): this
	patch(uri: string, handler: (ctx: IContext) => unknown): this
	delete(uri: string, handler: (ctx: IContext) => unknown): this
	options(uri: string, handler: (ctx: IContext) => unknown): this
	connect(uri: string, handler: (ctx: IContext) => unknown): this
}

export default class Router implements IRouter {
	store: {
		middleware?: IMiddleware[]
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

	static createMiddleware(router: IRouter, handler: IMiddleware | Router) {
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
				params: route.uri ? exec(uri, route.uriParams) : null,
				handler: route.handler
			}))
	}

	middleware() {
		return async (ctx: IContext): Promise<void> => {
			try {
				for (const handler of this.store.middleware || []) {
					if (ctx.stream.writable) await handler(ctx)
				}

				for (const route of Router.find(this, ctx.method, ctx.url.pathname)) {
					if (ctx.isSend) return
					ctx.params = route.params
					ctx.next = await route.handler(ctx) || undefined
				}
			} catch (e) {
				throw e
			}
		}
	}

	use(handler: IMiddleware | this) {
		Router.createMiddleware(this, handler)
		return this
	}

	all(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: '*', handler})
		return this
	}

	get(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'GET', handler})
		return this
	}

	post(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'POST', handler})
		return this
	}

	put(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'PUT', handler})
		return this
	}

	head(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'HEAD', handler})
		return this
	}

	delete(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'DELETE', handler})
		return this
	}

	options(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'OPTIONS', handler})
		return this
	}

	connect(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'CONNECT', handler})
		return this
	}
	trace(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'TRACE', handler})
		return this
	}
	patch(uri: string, handler: (ctx: IContext) => unknown) {
		Router.createRoute(this, {uri, method: 'PATCH', handler})
		return this
	}
}
