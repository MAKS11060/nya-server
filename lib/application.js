'use strict'

const createServer = require('./server')
const createHandler = require('./handler')


const app = () => {
	const server = createServer()
	const handler = createHandler(server)

	return {
		...server,
		...handler,
	}
}

module.exports = app()
