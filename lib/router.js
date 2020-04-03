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

const router = prop => {
	const scope = '/'
	//const store = {
	//	'/': {}
	//}
	//const props = {
	//	scope: typeof prop === 'string' ? prop : '/',
	//}
	//const routes = props.store[props.scope]['*']
	//? props.store[props.scope]['*']
	//: props.store[props.scope] = {'*': {}}

	//const scope = store.scope || '*'
	//const routes = store.routes
	//	?	store.routes[scope]
	//	: store.routes = {[scope]: {}}

	const useRoutes = (aScope, arouter) => {
	
	}

	const routes = {
		'*': []
	}
	
	/**
	 *
	 * @param uri {string} - handles path
	 * @param method {string} - http method
	 * @param handler {Function} - handler
	 */
	const push = (uri, method, handler) => {
		if (typeof uri !== 'string' && method !== '*') throw new Error('uri type is not a string')
		if (typeof method !== 'string') throw new Error('method type is not a string')
		if (typeof handler !== 'function') throw new Error('handler is not a function')
		
		method = method.toLowerCase()
		if (!routes[method]) routes[method] = []
		routes[method].push(method === '*' ? {
			uri: scope,
			handler,
			params: false
		} : {
			uri,
			handler,
			regprop: regexparam(uri)
		})
	}
	
	const find = (uri, method) => {
		const mapping = item => ({
			uri: item.uri,
			handler: item.handler,
			params: exec(uri, item.regprop)
		})
		return [
			...routes['*'],
			...routes['all'] ? routes['all']
			.filter(item => item.regprop.pattern.test(uri))
			.map(mapping) : [],
			...routes[method.toLowerCase()]	? routes[method.toLowerCase()]
			.filter(item => item.regprop.pattern.test(uri))
			.map(mapping) : []
		]
	}
	
	
	/**
	 * @description 'use' handlers run before router handlers
	 * @param handler {function} - request handler
	 */
	const use = (...handler) => {
		for (const el of handler) push('*', '*', el)
	}
	
	/**
	 * @description handle Any method
	 * @param uri {string} - handles path
	 * @param handler {function} - handler
	 */
	const all = (uri, handler) => {
		push(uri,'all', handler)
	}
	
	/**
	 *
	 * @param uri {string} - handles path
	 * @param handler {function} - handler
	 */
	const get  = (uri, handler) => push(uri,'get', handler)
	
	/**
	 *
	 * @param uri {string} - handles path
	 * @param handler {function} - handler
	 */
	const post = (uri, handler) => push(uri,'post', handler)
	
	/**
	 *
	 * @param uri {string} - handles path
	 * @param handler {function} - handler
	 */
	const put  = (uri, handler) => push(uri,'put', handler)
	
	/**
	 *
	 * @param uri {string} - handles path
	 * @param handler {function} - handler
	 */
	const del  = (uri, handler) => push(uri,'delete', handler)
	
	/**
	 *
	 * @param uri {string} - handles path
	 * @param handler {function} - handler
	 */
	const head    = (uri, handler) => push(uri,'head', handler)
	
	/**
	 *
	 * @param uri {string} - handles path
	 * @param handler {function} - handler
	 */
	const options = (uri, handler) => push(uri,'options', handler)
	
	//const connect = (uri, handler) => useMethod('connect', uri, handler)
	
	return {
		router,
		useRoutes,
		push, find,
		use, all,
		get, post, put, del,
		head, options,
		//connect
	}
}

module.exports = router
