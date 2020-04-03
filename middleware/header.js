'use strict'

module.exports = ctx => {
	Object.defineProperties(ctx, {
		headers: {enumerable: true, writable: false, configurable: false, value: ctx.req.headers},
	})

	ctx.header = new Proxy({}, {
		get: (target, prop) => {
			return target[prop.toLowerCase()]
		},
		set: (target, prop, value) => {
			target[prop.toLowerCase()] = value
			return true
		}
	})
}
