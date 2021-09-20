import Router from './components/router.js'
import {Handler, Middleware} from './handler.js'
import {Servers} from './server.js'

export {Server} from './server.js'
export {default as Router} from './components/router.js'

export {H2Websocket} from './components/h2-websocket.js'
export {CreateSPA} from './module/spa.js'

export class App {
	handler: Handler
	router: Router

	constructor() {
		this.handler = Handler.create()
		this.router = Router.create()

		this.use(this.router.middleware())
	}

	static create() {
		return new this()
	}

	static Router() {
		return Router.create()
	}

	use(handler: Middleware | Router) {
		if (typeof handler === 'function')
			this.handler.add(handler)
		else if (handler.middleware)
			this.handler.add(handler.middleware())
	}

	useServer(server: Servers): void {
		server.use(this)
	}
}
