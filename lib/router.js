'use strict'

const regexparam = require('regexparam')
const exec = (path, result) => {
  let i=0, out={}
  let matches = result.pattern.exec(path)
  while (i < result.keys.length) {
    out[ result.keys[i] ] = decodeURI(matches[++i]) || null
  }
  return out
}

const middleware = []
const routes = new Set

const push = (method, uri, handler) => {
	if (typeof handler !== 'function') throw new Error('handler is not a function')

	// for (const route of routes) {
		// if (route[method])
	// }

	routes.add({
		// id: routes.size,
		uri,
		regex: regexparam(uri),
		method,
		handler,
	})
}

const find = (uri, method) => {
	method = method.toLowerCase()
	const out = [...middleware]
	for (const item of routes) {

		if (item.regex.pattern.test(uri)) {
			out.push({
				params: exec(uri, item.regex),
				handler: item.handler,
			})
		}

		// if (!item[method]) {}
	}
	return out
}

const useMethod = (method, uri, handler) => {
	if (!uri) {
		throw new Error('uri is not defined')
	} else if (typeof uri === 'string') {
		push(method, uri, handler)
	} else if (uri instanceof Array) {
		for (const item of uri) {
			push(method, item, handler)
		}
	} else if (uri instanceof RegExp) {
		push(method, uri, handler)
	}
}

// methods
const use = (...fn) => {fn.map(i => middleware.push({params: false, handler: i}))}
 
const all = (uri, handler) => useMethod(false, uri, handler)

const get  = (uri, handler) => useMethod('get', uri, handler)
const post = (uri, handler) => useMethod('post', uri, handler)
const put  = (uri, handler) => useMethod('put', uri, handler)
const del  = (uri, handler) => useMethod('delete', uri, handler)

const head    = (uri, handler) => useMethod('head', uri, handler)
const options = (uri, handler) => useMethod('options', uri, handler)
// const connect = (uri, handler) => useMethod('connect', uri, handler)

const router = prop => {
	return {
		store: {
			middleware,
			routes
		},
		methods: {
			use,
			all,
			get, post, put, del,
			head, options,
			// connect
		},
		find,
	}
}

module.exports = router


if (!module.parent) {
	get('/', ctx => {})
	get('/*', ctx => {})
	get('/:abs', ctx => {})
	all('/home', ctx => {})
	get('/profile', ctx => {})
	get('/profile/me', ctx => {})
	get('/profile/@:id', ctx => {})
	
	get('/profile/@:id')
	// console.log(routes)

	// const result = find('/123?asfdbdf=12312', 'get')
	// const result = find('/home', 'get')
	// const result = find('/profile', 'get')
	// const result = find('/profile/me', 'get')
	// const result = find('/profile/@:id', 'get')

	// console.log(result)
}
