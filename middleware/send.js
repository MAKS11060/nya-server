'use strict'

// const is = require('is-stream')
const { Readable } = require('stream')


/*const createStream = buffer => new Readable({
	read: function(size) {
		this.push(buffer)
		this.push(null)
	}
})*/


module.exports = ctx => {
	const {
		socket,
		stream,
	} = ctx

	const respond = headers => {
		if (ctx.req.httpVersionMajor === 2) {
			ctx.stream.respond({
				...ctx.header,
				...headers,
			})
		} else {
			const status = ctx.header['status']
			status ? delete ctx.header['status'] : null

			ctx.res.writeHead(status || 200, {
				...ctx.header,
				...headers,
			})
		}
	}

	const write = (c) => {
		// if (!stream.writable) return false
	
		// if (ctx.req.httpVersionMajor === 2) {
		// 	ctx.respond()
		// 	ctx.req.stream.write(data)
		// } else {

		// }
	}

	const end = (data = '') => {
		if (!socket.writable) return false
		if (ctx.req.httpVersionMajor === 2) {
			ctx.respond()
			stream.end(data)
		} else {
			ctx.respond()
			ctx.res.end(data)
		}
	}

	const pipe = src => {
		// ctx.isPipe = true
		// if (is.readable(src)) {
		// 	ctx.respond()
		// 	src.pipe(ctx.stream)
		// } else {
		// 	throw new Error('is not a stream')
		// }
	}

	const send = (data, ...args) => {
		// const ctx = ctx
		// if (Buffer.isBuffer(data)) {
		// 	ctx.size(data.byteLength)
		// 	ctx.pipe(createStream(data))
		// } else if (typeof data === 'object') {
		// 	data = Buffer.from(JSON.stringify(data, ...args))
		// 	ctx.type('json')
		// 	ctx.size(data.byteLength)
		// 	ctx.pipe(createStream(data))
		// } else if (typeof data === 'string') {
		// 	data = Buffer.from(data)
		// 	ctx.size(data.byteLength)
		// 	ctx.pipe(createStream(data))
		// } else if (typeof data === 'number' || typeof data === 'boolean') {
		// 	data = Buffer.from(String(data))
		// 	ctx.size(data.byteLength)
		// 	ctx.pipe(createStream(data))
		// } else if (typeof data === 'undefined') {
		// 	ctx.end()
		// }
	}


	Object.defineProperties(ctx, {
		respond: {enumerable: true, writable: false, configurable: false, value: respond},
		write: {enumerable: true, writable: false, configurable: false, value: write},
		end: {enumerable: true, writable: false, configurable: false, value: end},
		send: {enumerable: true, writable: false, configurable: false, value: send},
		pipe: {enumerable: true, writable: false, configurable: false, value: pipe},
	})
}