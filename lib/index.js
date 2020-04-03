const server = require('./server')
const router = require('./router')
const handler = require('./handler')


const createApp = prop => {
	const store = {
		scope: '/',
		...prop,
	}

	const dserver = server(store)
	const drouter = router(store.scope)
	const dhandler = handler(dserver, drouter)

	return {
		createApp,
		...dserver,
		...drouter,
		...dhandler
	}
}

module.exports = createApp
