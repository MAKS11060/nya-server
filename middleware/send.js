'use strict'

module.exports = ctx => {
	const {	socket,	stream, res: {writableEnded}} = ctx
	let isRespond = 0

	const respond = headers => {
		if (isRespond++) return
		if (ctx.req.httpVersionMajor === 2) {
			ctx.stream.respond({
				...ctx.header,
				...headers,
			})
		} else {
			const {status, ...oth} = ctx.header
			ctx.res.writeHead(status || 200, {
				...oth,
				...headers,
			})
		}
	}

	const write = data => {
		if (!socket.writable || ctx.res.writableEnded) return false
		ctx.respond()
		if (ctx.req.httpVersionMajor === 2) {
			stream.write(data)
		} else {
			ctx.res.write(data)
		}
	}

	const end = (data = '') => {
		if (!socket.writable || ctx.res.writableEnded) return false
		ctx.respond()
		if (ctx.req.httpVersionMajor === 2) {
			stream.end(data)
		} else {
			ctx.res.end(data)
		}
	}

	const send = (data, ...args) => {
		switch (typeof data) {
			case 'string': data = Buffer.from(data); break
			case 'object':
				if (Buffer.isBuffer(data)) break
				data = Buffer.from(JSON.stringify(data, ...args))
				ctx.type('json')
				break
			case 'function':
				const d = data(...args)
				console.log(typeof d, d)
				return ctx.send(d)
			case 'boolean':
			case 'number':
			case 'bigint': data = Buffer.from(String(data)); break
			default: data = Buffer.from('')
		}
		ctx.size(data.byteLength)
		ctx.end(data)
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
	
	
	Object.defineProperties(ctx, {
		respond: {enumerable: true, writable: false, configurable: false, value: respond},
		write: {enumerable: true, writable: false, configurable: false, value: write},
		end: {enumerable: true, writable: false, configurable: false, value: end},
		send: {enumerable: true, writable: false, configurable: false, value: send},
		//pipe: {enumerable: true, writable: false, configurable: false, value: pipe},
	})
}