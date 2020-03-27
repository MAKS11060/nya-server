const router = require('./router')
const WS = require('./webSocket')

const { methods, find } = router()
const { use } = methods


// context
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


// handlers
const _http = async (req, res) => {
	const { socket, stream, headers, method } = req

	const ctx = createContext({
		req, res, type: 'http', 
		socket, stream,
	})

	if (method === 'GET' && headers['upgrade'] === 'websocket') {
		_ws(req)
		return
	}

	ctx.url = new URL(req.url, `http://${headers.host}`)
	ctx.url.port = req.socket.localPort


	// if (ctx.url.pathname === '/.well-known/acme-challenge/AUnpvAYs8Agj1ZWqKtwKMieQFk8s6zgG33QppWB9ob4')	{
	// 	res.end('AUnpvAYs8Agj1ZWqKtwKMieQFk8s6zgG33QppWB9ob4.Q04lvn0EnNWDMMPWQEq5uJKXj3-VOXbxisvA2d5i0Ug')
	// 	return
	// }

	ctx.url.protocol = 'https'
	res.writeHead(302, {location: ctx.url.toString()})
	res.end()
}

const _https = async (req, res) => {
	const { socket,	stream, headers, method,
		httpVersion, httpVersionMajor, httpVersionMinor,
	} = req

	const ctx = createContext({
		req, res, type: 'https', 
		socket, stream,
	})

	try {
		// webSocket
		if (method === 'GET' && headers['upgrade'] === 'websocket') {
			_wss(req)
			return
		}

		// EventSource
		if (headers['content-type'] === 'text/event-stream') {
			socket.destroy()
			return
		}

		// http2
		if (httpVersionMajor === 2) {
			ctx.url = new URL(`https://${headers[':authority']}${headers[':path']}`)
			ctx.url.port = req.socket.localPort
			ctx.httpVersion = httpVersion

			for (const {handler, params} of find(ctx.url.pathname, method)) {
				if (socket.writable) {
					ctx.params = params
					ctx.next = await handler(ctx) || null
				}
			}

			if (socket.writable) {
				ctx.status(404)
				ctx.end()
			}

			ctx.emit('end')
			return
		}

		// http1
		if (httpVersionMajor !== 2) {
			ctx.url = new URL(req.url, `https://${headers.host}`)
			ctx.url.port = req.socket.localPort
			ctx.httpVersion = httpVersion

			for (const {handler, params} of find(ctx.url.pathname, method)) {
				if (socket.writable) {
					ctx.params = params
					ctx.next = await handler(ctx) || null
				}
			}

			if (socket.writable) {
				ctx.status(404)
				ctx.end()
			}

			ctx.emit('end')
			return

			ctx.url = new URL(req.url, `https://${headers.host}`)
			ctx.httpVersion = httpVersion

			/* headers */
			const status = ctx.header['status']
			status ? delete ctx.header['status'] : null

			stream._writable.writeHead(status || 200, {
				...header,
				...headers,
			})

			// ctx.emit('end')
			return
		}

	} catch (err) {
		socket.destroy()
		console.error(err)
	}
}

const _ws = req => {
	const { socket, headers } = req
	webSocket.ws.handleUpgrade(req, socket, headers, client=> {
		webSocket.ws.emit('connection', client)
	})
}

const _wss = req => {
	const { socket, headers } = req
	webSocket.wss.handleUpgrade(req, socket, headers, client=> {
		webSocket.wss.emit('connection', client)
	})
}

const webSocket = {
	ws: new WS,
	wss: new WS
}


// middleware
use(ctx => {Object.defineProperties(ctx, {
	ctx:    {enumerable: false, writable: false, configurable: false, value: ctx},
	method: {enumerable: true, writable: false, value: ctx.req.method },
	ip:     {enumerable: true, writable: false, value: ctx.socket.remoteAddress},
	ipV4:   {enumerable: true, writable: false, value: ctx.socket.remoteAddress.replace(/^.*:/, '')}
})})

use(require('../middleware/header'))
use(require('../middleware/status'))
use(require('../middleware/contentType'))
use(require('../middleware/contentLength'))
use(require('../middleware/cookie'))
use(require('../middleware/send'))

use(require('../middleware/body'))



// export
const handler = prop => {
	const { http, https } = prop

	http.on('request', _http)
	https.on('request', _https)

	return {
		...methods,
		...webSocket,
		// options,
		setContext
	}
}

module.exports = handler
