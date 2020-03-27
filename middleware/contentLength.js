'use strict'

module.exports = ctx => {
	const size = contentLength => {
		if (typeof contentLength === 'number') {
			ctx.header['Content-Length'] = contentLength
		} else {
			throw TypeError('Content-Length is not a number')
		}
	}

	Object.defineProperty(ctx, 'size', {
		enumerable: true, configurable: false, writable: false, value: size
	})
}