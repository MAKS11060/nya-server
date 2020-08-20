const send = (ctx, data, ...args) => {
	switch (typeof data) {
		case 'string': data = Buffer.from(data);break
		case 'object':
			if (Buffer.isBuffer(data)) break
			data = Buffer.from(JSON.stringify(data, ...args))
			ctx.type = 'json'
			break
		case 'function':
			return ctx.send(data(...args))
		case 'boolean':
		case 'number':
		case 'bigint': data = Buffer.from(String(data)); break
		default: data = Buffer.from('')
	}
	ctx.length = data.byteLength
	ctx.end(data)
}

export default ctx => {
	const {headers, req, res} = ctx

	if (headers['upgrade'] === 'websocket' && method === 'GET') {
		return ctx.socket.destroy()
	}
	
	if (headers['content-type'] === 'text/event-stream') {
		return ctx.socket.destroy()
	}

	if (ctx.req.httpVersionMajor === 2) {
		ctx.url = new URL(headers[':path'],`https://${headers[':authority']}`)
	
		ctx.respond = headers => {
			if (ctx.state.isRespond) return
			else ctx.state.isRespond = true
			req.stream.respond({
				...ctx.header,
				...headers,
			})
		}
		ctx.write = data => {
			if (!ctx.writable) return false
			ctx.respond()
			req.stream.write(data)
		}
		ctx.end = data => {
			if (!ctx.writable) return false
			ctx.respond()
			req.stream.end(data)
		}
	}
	
	if (ctx.req.httpVersionMajor !== 2) {
		if (ctx.socket.encrypted)	ctx.url = new URL(ctx.req.url, `https://${ctx.req.headers.host}`)
		else ctx.url = new URL(ctx.req.url, `http://${ctx.req.headers.host}`)

		ctx.respond = headers => {
			if (ctx.state.isRespond) return
			else ctx.state.isRespond = true
			const {status, ...header} = ctx.header
			res.writeHead(status || 200, {
				...header,
				...headers,
			})
		}
		ctx.write = data => {
			if (!ctx.writable) return false
			ctx.respond()
			res.write(data)
		}
		ctx.end = data => {
			if (!ctx.writable) return false
			ctx.respond()
			res.end(data)
		}
	}
	
	Object.defineProperties(ctx, {
		send: {enumerable: true, value: send.bind(null, ctx)},
		
		body: {
			enumerable: true, configurable: true,
			set(v) {
				ctx.end(v)
			}
		},
		json: {
			enumerable: true,
			set(v) {
				ctx.type = 'json'
				ctx.body = JSON.stringify(v)
			}
		},
		html: {
			enumerable: true,
			set(v) {
				ctx.type = 'html'
				ctx.body = v || ''
			}
		},
		text: {
			enumerable: true,
			set(v) {
				ctx.type = 'text'
				ctx.body = v || ''
			}
		}
		//stream: {}
	})
}