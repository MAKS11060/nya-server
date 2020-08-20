const createContext = (req, res) => {
	const ctx = Object.create(null, {
		state: {enumerable: true, configurable: false, writable: true, value: {}},

		req: {enumerable: false, configurable: false, writable: false, value: req},
		res: {enumerable: false, configurable: false, writable: false, value: res},

		socket: {enumerable: false, configurable: false, writable: false, value: req.socket},
		method: {enumerable: true, configurable: false, writable: false, value: req.method},
	})

	ctx.state.isRespond = false
	
	return ctx
}

export const Handler = () => {
	const handler = {stack: []}

	handler.use = fn => {
		if (typeof fn !== 'function') throw new TypeError('middleware must be a function!')
		handler.stack.push(fn)
	}
	//handler.error = (msg) => {
	//	throw new Error(msg)
	//}
	handler.callback = () => {
		return async (req, res) => {
			const ctx = createContext(req, res)
			try {
				for (const el of handler.stack) {
					await el(ctx)
				}
			} catch (e) {
				ctx.socket.destroy()
				throw e
			}
		}
	}

	return handler
}