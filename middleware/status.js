'use strict'

module.exports = ctx => {
	const { req: { httpVersionMajor } } = ctx
	const status = code => {
		if (typeof code === 'number') {
			ctx.header[httpVersionMajor === 2 ? ':status' : 'status'] = code
		} else {
			return ctx.header[httpVersionMajor === 2 ? ':status' : 'status'] || 200
		}
	}

	Object.defineProperty(ctx, 'status', {
		enumerable: true, configurable: false, writable: false, value: status
	})
}