const WS = require('./webSocket')

const webSocket = {
	ws: new WS,
	wss: new WS
}
const preContext = {}


const setContext = prop => {
	for (const key in prop) {
		preContext[key] = prop[key]
	}
}

const createContext = prop => {
	const _events = {}
	const context = Object.create({
		state: preContext, ...prop
	}, {
		emit: {enumerable: true, value: (event, ...args) => {
				if (!_events[event]) return
				_events[event].forEach(fn => fn(...args))
			}},
		on: {enumerable: true, value: (event, cb) => {
				if (!_events[event]) _events[event] = []
				_events[event].push(cb)
			}},
		
		onend: {enumerable: true, set: cb => {
				context.on('end', cb)
			}},
	})
	return context
}

const setMiddleware = (cb, list) => list.forEach(i => cb(i))

const run = async (router, ctx) => {
	for (const {handler, params} of router.find(ctx.url.pathname, ctx.method)) {
		if (ctx.socket.writable) {
			ctx.params = params
			ctx.next = await handler(ctx) || null
		}
	}
	
	// forced end
	if (ctx.socket.writable) {
		ctx.status(404)
		ctx.end()
	}
}


const handler = {
	http(router) {
		return async (req, res) => {
			const {socket, stream, headers, method} = req
			
			const ctx = createContext({
				req, res, type: 'http',
				socket, stream, method
			})
			
			if (headers['upgrade'] === 'websocket' && method === 'GET') {
				return handler.ws(req)
			}
			
			ctx.url = new URL(req.url, `http://${headers.host}`)
			ctx.url.port = req.socket.localPort
			
			try {
				await run(router, ctx)
			} catch (e) {
				socket.destroy()
				console.error(err)
			}
		}
	},
	async https(router) {
		return async (req, res) => {
			const {socket, stream, headers, method,
				httpVersion, httpVersionMajor, httpVersionMinor
			} = req
			
			const ctx = createContext({
				req, res, type: 'https',
				socket, stream, method
			})
			
			if (headers['upgrade'] === 'websocket' && method === 'GET') {
				return handler.wss(req)
			}

			if (headers['content-type'] === 'text/event-stream') {
				return socket.destroy()
			}
			
			if (httpVersionMajor === 2) {
				ctx.url = new URL(headers[':path'],`https://${headers[':authority']}`)
				ctx.url.port = req.socket.localPort
				
				try {
					await run(router, ctx)
				} catch (e) {
					socket.destroy()
					console.error(err)
				}
			}

			if (httpVersionMajor !== 2) {
				ctx.url = new URL(req.url, `https://${headers.host}`)
				ctx.url.port = socket.localPort
				
				try {
					await run(router, ctx)
				} catch (e) {
					socket.destroy()
					console.error(err)
				}
			}
		}
	},
	ws(req) {
		const { socket, headers } = req
		webSocket.ws.handleUpgrade(req, socket, headers, client=> {
			webSocket.ws.emit('connection', client)
		})
	},
	wss(req) {
		const { socket, headers } = req
		webSocket.wss.handleUpgrade(req, socket, headers, client=> {
			webSocket.wss.emit('connection', client)
		})
	}
}


module.exports = (server, router) => {
	const { http, https } = server

	http.on('request', handler.http(router))
	https.on('request', handler.https(router))

	return {
		...webSocket
	}
}
