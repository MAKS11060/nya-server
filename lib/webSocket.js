const ws = require('ws')


class WSClient {
	constructor(client) {
		this.client = client
	}

	send(data) {
		if (Buffer.isBuffer(data)) {
			data = data.toString()
		} else if (typeof data === 'object') {
			data = JSON.stringify(data)
		} else if (typeof data === 'string') {
		} else if (typeof data === 'number' || typeof data === 'boolean') {
			data = String(data)
		}
		this.client.send(data)
	}
}

class WS extends ws.Server {
	constructor() {super({noServer: true})
		this.__clients = new Set

		this.on('connection', client => {
			const c = new WSClient(client)
			this.__clients.add(c)
			this.emit('open', c)
			this.emit('client', c)
			client.on('close', close => {
				for (const client of this.__clients) {
					if (client === c) this.__clients.delete(c)
				}
			})
		})
	}

	send(data) {
		if (Buffer.isBuffer(data)) {
			data = data.toString()
		} else if (typeof data === 'object') {
			data = JSON.stringify(data)
		} else if (typeof data === 'string') {
		} else if (typeof data === 'number' || typeof data === 'boolean') {
			data = String(data)
		}

		for (const client of this.clients) {
			client.send(data)
		}
	}
}

module.exports = WS
