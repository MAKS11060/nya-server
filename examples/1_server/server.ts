import {App} from '../../src/index.js'

const {route} = new App({
	// http: 'http'
	// http: 'https',
	http: 'h2', /*options: {allowHTTP1: true},*/ settings: {enableConnectProtocol: true},
	cert: 'cert.pem',
	key: 'privkey.pem',
	log: 'error'
})
	.listen(40443)

route.use(ctx => {
	console.log(ctx.method, ctx.pathname)
})

route.use(await import('./api.js'))
route.use(await import('./proxy.js'))
