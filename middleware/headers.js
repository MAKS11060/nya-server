import mime from 'mime'

export default ctx => {
	const {res,	req: {socket, httpVersionMajor}} = ctx
	
	Object.defineProperties(ctx, {
		writable: {
			get() {
				if (res.writableEnded || res.finished) return false
				return socket.writable
			}
		},
	})
	
	ctx.header = new Proxy({}, {
		get: (target, prop) => target[prop.toLowerCase()],
		set: (target, prop, value) => {
			target[prop.toLowerCase()] = value
			return true
		}
	})

	Object.defineProperties(ctx, {
		headers: {
			enumerable: true,
			set(val) {
				console.log(`set headers: ${val}`)
			},
			get() {
				return ctx.req.headers
			}
		},
		status: {
			enumerable: true,
			set(code) {
				if (ctx.state.isRespond) return

				if (!Number.isInteger(code)) ctx.error(`status code must be a number`)
				
				if (code >= 100 && code <= 999)
					ctx.header[httpVersionMajor === 2 ? ':status' : 'status'] = code
				else ctx.error(`invalid status code: ${code}`)
			},
			get() {
				return ctx.header[httpVersionMajor === 2 ? ':status' : 'status'] || 200
			}
		},
		length: {
			enumerable: true,
			set(n) {
				if (!Number.isInteger(n)) ctx.error('length must be a number')
				ctx.header['Content-Length'] = n
			},
			get() {
				return +ctx.headers['content-length'] || null
			}
		},
		type: {
			enumerable: true,
			set(type) {
				if (typeof type !== 'string') ctx.error('type must be a string')
				switch (type.toLowerCase()) {
					case 'html':
					case 'text/html':
						ctx.header['content-type'] = 'text/html; charset=utf-8';break
					
					case 'css':
					case 'sass':
					case 'scss':
					case 'text/css':
						ctx.header['content-type'] = 'text/css';break
					
					case 'json':
					case 'application/json':
						ctx.header['content-type'] = 'application/json';break
					
					case 'js':
					case 'javascript':
					case 'application/javascript':
						ctx.header['content-type'] = 'application/javascript';break
					
					case 'txt':
					case 'text':
					case 'text/plain':
						ctx.header['content-type'] = 'text/plain; charset=utf-8';break
					
					case 'event':
					case 'event-stream':
						ctx.header['content-type'] = 'text/event-stream';break
					
					default: ctx.header['content-type'] = mime.getType(type)
				}
			},
			get() {
				return ctx.header['content-type'] || null
			}
		},
		etag: {
			enumerable: true,
			set(val) {
				ctx.headers['etag'] = val
			},
			get() {
				return ctx.headers['etag'] || null
			}
		},
		lastModified: {
			enumerable: true,
			set(val) {
				if (typeof val === 'string') val = new Date(val);
				ctx.header['Last-Modified'] = val
			},
			get() {
				return ctx.headers['last-modified'] || null
			}
		},
		ip: {
			enumerable: true,
			get() {
				return ctx.socket.remoteAddress
			}
		},
		ipV4: {
			enumerable: true,
			get() {
				return ctx.socket.remoteAddress.replace(/^.*:/, '')
			}
		}
	})
}