import {Router} from './src/router.js'
import {Handler} from './src/handler.js'

import error from './middleware/error.js'
import headers from './middleware/headers.js'
import content from './middleware/content.js'
import body from './middleware/body.js'
import cookie from './middleware/cookie.js'

export const createApp = () => {
	const router = Router()
	const handler = Handler()
	
	handler.use(error)

	handler.use(headers)
	handler.use(content)
	handler.use(body({payload: '10mb'}))
	handler.use(cookie())
	handler.use(router.middleware())
	
	handler.use(ctx => { // !!!
		if (ctx.writable) {
			ctx.socket.destroy()
		}
	})
	
	return {
		router,
		handler
	}
}

export default () => createApp()
export {Router}
