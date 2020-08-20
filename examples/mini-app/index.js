import App from '../../index.js'
import {createServer} from 'http'
import {createSecureServer} from "http2"
import fs from "fs"
import * as pages from './routes/pages.js'
import * as api from './routes/api.js'

const {handler, router} = App()

router.routes('/', pages.router)
router.routes('/api', api.router)

router.all('/*', ctx => {
	if (ctx.writable) {
		ctx.status = 404
		ctx.send(`<h1>Not Found</h1> The requested URL ${ctx.url.pathname} was not found on this server<hr>`)
	}
})


/****************** SERVER ******************/
createServer(handler.callback()).listen(80) // http

const h2 = createSecureServer({
	allowHTTP1: true,
	key: fs.readFileSync(process.env.PATH_KEY),
	cert: fs.readFileSync(process.env.PATH_CERT)
}).listen(443) // http2(s)
h2.on('request', handler.callback())
