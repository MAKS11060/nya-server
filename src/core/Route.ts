import {parse} from 'regexparam'
import {HTTPMethod, MiddlewareHandler, RouteHandler, RouteMethod, RouteParams} from './types.js'

interface Routes {
	path: string
	method: HTTPMethod | null
	handler: RouteHandler<RouteParams<string>, RouteMethod>
	params: { keys: string[], pattern: RegExp }
}

const exec = (path: string, result: { keys: string[], pattern: RegExp }) => {
	let i = 0, out: { [key: string]: string | null } = {}
	let matches = result.pattern.exec(path)
	if (matches == null) return out
	while (i < result.keys.length) {
		out[result.keys[i]] = decodeURI(matches[++i]) || null
	}
	return out
}

export class Route {
	private readonly middleware: MiddlewareHandler[] = []
	private readonly routes: Routes[] = []
	// connected routers
	private readonly routers: Route[] = []

	static getMiddleware(self: Route) {
		return self.middleware
	}

	static find(self: Route, method: HTTPMethod, path: string) {
		return self.routes
			.filter(route => (route.method == method || route.method == null) && route.params.pattern.test(path))
			.map(route => ({
				path: route.path || null,
				params: exec(path, route.params),
				handler: route.handler,
			}))
	}

	use(handler: MiddlewareHandler | Route | Promise<{ route: Route }> | Awaited<Promise<{ route: Route }>>) {
		if (handler instanceof Promise) {
			handler.then(({route}) => {
				this.use(route)
			})
			return
		}

		// Module // await import()
		if (typeof handler == 'object' && handler?.route instanceof Route) {
			this.use(handler.route)
			return
		}

		for (const linkedRouter of this.routers) {
			linkedRouter.use(handler)
		}

		// Route
		if (handler instanceof Route) {
			const router: Route = handler
			if (!router.routers.includes(this)) router.routers.push(this)

			// copy from Connected router
			this.middleware.push(...router.middleware.filter(value => !this.middleware.includes(value)))
			this.routes.push(...router.routes.filter(value => !this.routes.includes(value)))

			return this
		}

		// Middleware
		if (typeof handler == 'function') this.middleware.push(handler)

		return this
	}

	route<P extends string, M extends RouteMethod>(path: P, method: M | null, handler: RouteHandler<RouteParams<P>, M>) {
		if (typeof method == 'string' || null == method) {
			// @ts-ignore
			this.routes.push({path, method: method ? method : null, handler, params: parse(path)})
		}

		for (const methodElement of method as HTTPMethod[]) {
			// @ts-ignore
			this.routes.push({path, method: methodElement, handler, params: parse(path)})
		}

		return this
	}

	any<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, HTTPMethod>) {
		this.route(path, null, handler)
	}

	get<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'GET'>) {
		this.route(path, 'GET', handler)
	}

	put<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'PUT'>) {
		this.route(path, 'PUT', handler)
	}

	post<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'POST'>) {
		this.route(path, 'POST', handler)
	}

	head<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'HEAD'>) {
		this.route(path, 'HEAD', handler)
	}

	patch<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'PATCH'>) {
		this.route(path, 'PATCH', handler)
	}

	delete<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'DELETE'>) {
		this.route(path, 'DELETE', handler)
	}

	options<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'OPTIONS'>) {
		this.route(path, 'OPTIONS', handler)
	}

	connect<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'CONNECT'>) {
		this.route(path, 'CONNECT', handler)
	}

	trace<P extends string>(path: P, handler: RouteHandler<RouteParams<P>, 'TRACE'>) {
		this.route(path, 'TRACE', handler)
	}
}

// Ver 1
/*import * as Process from 'process'

class Test {
	private static prefixTmp: string = ''
	static handler: any[] = []

	static run() {
		for (let {text, cb} of this.handler) {
			cb(text)
		}
	}

	static use<T>(text: T, cb: (data: T) => void) {
		console.log('set use:', text)
		this.handler.push({text: this.prefixTmp + text, cb})
		// process.nextTick(cb, this.prefixTmp + text)
		return Test
	}

	static group(cb: () => void) {
		// console.log('create group')
		process.nextTick(cb) // call before any methods
		// Test.prefixTmp = ''
		// Test.prefixTmp = Test.prefixTmp ==
		return Test
	}

	static prefix(prefix: string) {
		console.log('set prefix:', prefix)
		if (Test.prefixTmp === prefix) Test.prefixTmp += prefix
		return Test
	}
}

Test.group(() => {
	Test.use('1', data => console.log('run:', data))

	Test.group(() => {
		Test.use('2', data => console.log('run:', data))
		Test.group(() => {
			Test.use('5', data => console.log('run:', data))
		}).prefix('user/')
	}).prefix('v1/')

	Test.group(() => {
		Test.use('3', data => console.log('run:', data))
	}).prefix('auth/')

	Test.group(() => {
		Test.use('4', data => console.log('run:', data))
	}).prefix('dev/')
}).prefix('api/')

setImmediate(() => {
	Test.run()
})
*/

// Ver 2
// class Test {
// 	handler: any[] = []
// 	groups: Map<any, any> = new Map()
// 	prefixs: string[] = []
// 	changeLayer = false
//
// 	get currentPrefix(): string {
// 		return this.prefixs.reduce((p, c) => join(p, c), '')
// 	}
//
// 	run() {
// 		for (let {path, cb} of this.handler) {
// 			cb(path)
// 		}
// 	}
//
// 	route<T extends string>(path: T, cb: (data: T) => void) {
// 		this.handler.push({prefix: this.currentPrefix, path: join(path), cb})
// 		return this
// 	}
//
// 	prefix(prefix: string) {
// 		process.nextTick(() => {
// 			console.log('set prefix:', prefix)
// 			this.prefixs.push(prefix)
// 		})
// 		return this
// 	}
//
// 	group(cb: () => void) {
// 		process.nextTick(cb)
// 		return this
// 	}
// }
//
// const test = new Test()
// test.group(() => {
// 	test.group(() => test.route('/rand/', console.log)).prefix('/v1')
// 	test.group(() => test.route('/rand/:byte', console.log)).prefix('/v2')
// }).prefix('/api')
//
// setImmediate(() => {
// 	console.log('handlers', test.handler)
// 	// test.run()
// })

