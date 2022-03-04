import {Method} from './context.js'
import {Handle} from './handler.js'
import {parse} from 'regexparam'

const exec = (path: string, result: { keys: string[], pattern: RegExp }): { [key: string]: string | null } => {
	let i = 0, out = {}
	let matches = result.pattern.exec(path)
	while (i < result.keys.length) {
		out[result.keys[i]] = decodeURI(matches[++i]) || null
	}
	return out
}

type Route = {
	uri: string
	method: string
	handler: Handle<Method, string>
	uriParams?: { keys: string[], pattern: RegExp }
}
type Middleware = Handle<Method, string>

export type ParseRouteParams<R> = R extends `${string}/:${infer P}/${infer Rest}`
	? P | ParseRouteParams<`/${Rest}`>
	: R extends `${string}/:${infer P}`
		? P
		: never

export class Router {
	readonly routes: Route[] = []
	readonly middleware: Middleware[] = []
	private readonly linked_routers: Router[] = []

	static find(self: Router, method: Method, uri: string) {
		return self.routes
			.filter(route => (route.method == method || route.method == null) && route.uriParams.pattern.test(uri))
			.map(route => ({
				uri: route.uri || null,
				params: exec(uri, route.uriParams),
				handler: route.handler
				// params: route.uri || new Map(Object.entries(exec(uri, route.uriParams))),
			}))
	}

	private static createRoute<Path extends string>(self: Router, uri: Path, method: Method, handler: Handle<Method, ParseRouteParams<Path>>) {
		self.routes.push({uri, method, handler, uriParams: parse(uri)})
	}

	private static createMiddleware(self: Router, handler: Handle<Method, string>) {
		self.middleware.push(handler)
	}

	// Usage: router.useImport(import('./pathToRouter.js')) // Router file: export const router = new Router()
	useImport(data: Promise<{ router: Router }>) {
		data.then(value => {
			if (value?.router instanceof Router) {
				this.use(value.router)
				return value.router
			}
		})
	}

	// Usage: router.use(ctx => { /* code */ }) or router.use(anyRouter)
	use(handler: Handle<Method, string> | Router): this {
		for (const linkedRouter of this.linked_routers) {
			linkedRouter.use(handler)
		}

		if (handler instanceof Router) {
			const router: Router = handler
			if (!router.linked_routers.includes(this)) router.linked_routers.push(this)

			this.middleware.push(...router.middleware.filter(value => !this.middleware.includes(value)))
			this.routes.push(...router.routes.filter(value => !this.routes.includes(value)))

			return this
		}

		Router.createMiddleware(this, handler)
		return this
	}

	// handle all methods
	all<Path extends string>(uri: Path, handler: Handle<Method, ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, null, handler)
		return this
	}

	get<Path extends string>(uri: Path, handler: Handle<'GET', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'GET', handler)
		return this
	}

	put<Path extends string>(uri: Path, handler: Handle<'PUT', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'PUT', handler)
		return this
	}

	head<Path extends string>(uri: Path, handler: Handle<'HEAD', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'HEAD', handler)
		return this
	}

	post<Path extends string>(uri: Path, handler: Handle<'POST', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'POST', handler)
		return this
	}

	trace<Path extends string>(uri: Path, handler: Handle<'TRACE', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'TRACE', handler)
		return this
	}

	patch<Path extends string>(uri: Path, handler: Handle<'PATCH', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'PATCH', handler)
		return this
	}

	delete<Path extends string>(uri: Path, handler: Handle<'DELETE', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'DELETE', handler)
		return this
	}

	options<Path extends string>(uri: Path, handler: Handle<'OPTIONS', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'OPTIONS', handler)
		return this
	}

	connect<Path extends string>(uri: Path, handler: Handle<'CONNECT', ParseRouteParams<Path>>): this {
		Router.createRoute(this, uri, 'CONNECT', handler)
		return this
	}
}

export const routerHandler = (router: Router): Handle => {
	return async ctx => {
		try {
			for (const handle of router.middleware) {
				if (!ctx.isSent) await handle(ctx)
			}
			for (const route of Router.find(router, ctx.method, ctx.uri.pathname)) {
				Object.defineProperty(ctx, 'params', {
					get(): any {
						return route.params
					}
				})
				await route.handler(ctx)
			}
		} catch (e) {
			throw e
		}
	}
}
