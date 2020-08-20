import regexparam from 'regexparam'

const exec = (path, result) => {
	let i=0, out={}
	let matches = result.pattern.exec(path)
	while (i < result.keys.length) {
		out[result.keys[i]] = decodeURI(matches[++i]) || null
	}
	return out
}

const append = (router, data) => {
	if (typeof data.handler !== 'function') throw new Error('handler is not a function')
	if (data.type === 'middleware') {
		router.routers[data.type] = [...router.routers[data.type] || [], data]
	}
	if (data.type === 'route') {
		if (typeof data.uri !== 'string') throw new TypeError('uri is not a string')
		if (typeof data.method !== 'string') throw new Error('method type is not a string')
		data.regexparam = regexparam(data.uri)
		
		router.routers[data.type] = [...router.routers[data.type] || [], data]
	}
}

const find = (router, method, uri) => {
	method = method.toUpperCase()
	return [
		...router.routers['middleware'] || [],
		...(router.routers['route'] || []).filter(i => i.regexparam.pattern.test(uri) &&
			(i.method === '*' || i.method === method))
	].map(i => ({
		uri: i.uri ? i.uri : null,
		params: i.uri ? exec(uri, i.regexparam) : null,
		handler: i.handler,
	}))
}

export const Router = () => {
	const router = Object.create(null, {
		type: {enumerable: false, value: 'router'},
		routers: {enumerable: false, value: {}}
	})

	router.routes = (prefix, Router) => {
		if (typeof prefix === 'object' && prefix.type === 'router') {
			Router = prefix
			prefix = '/'
		}
		if (typeof prefix === 'string' && typeof Router === 'object' && Router.type === 'router') {
			const {middleware = [], route = []} = Router.routers
			for (const el of middleware) {
				append(router, {...el})
			}
			for (const el of route) {
				append(router, {
					...el, uri: '/' + [prefix, el.uri].join('').split('/').filter(v => v).join('/')
				})
			}
		}
	}

	router.use = (...handlers) => {
		for (const handler of handlers) {
			if (typeof handler === 'function') {
				append(router, {handler, type: 'middleware'})
			}
		}
		return router
	},

	//routes
	router.all = (uri, handler) => {
		append(router, {method: '*', type: 'route', handler, uri})
		return router
	}
	router.get = (uri, handler) => {
		append(router, {method: 'GET', type: 'route', handler, uri})
		return router
	}
	router.put = (uri, handler) => {
		append(router, {method: 'PUT', type: 'route', handler, uri})
		return router
	}
	router.post = (uri, handler) => {
		append(router, {method: 'POST', type: 'route', handler, uri})
		return router
	}
	router.head = (uri, handler) => {
		append(router, {method: 'HEAD', type: 'route', handler, uri})
		return router
	}
	router.delete = (uri, handler) => {
		append(router, {method: 'DELETE', type: 'route', handler, uri})
		return router
	}
	router.options = (uri, handler) => {
		append(router, {method: 'OPTIONS', type: 'route', handler, uri})
		return router
	}
	router.connect = () => {
		throw new Error('pass')
	}

	router.middleware = () => {
		return async ctx => {
			try {
				for (const route of find(router, ctx.method, ctx.url.pathname)) {
					if (ctx.socket.writable) {
						ctx.params = route.params
						ctx.next = await route.handler(ctx) || null
					}
				}
			} catch (e) {
				throw e
			}
		}
	}
	return router
}
