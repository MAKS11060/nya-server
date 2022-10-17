import {App} from '../../src/index.js'

const {route} = new App({
	// http: 'http'
	// http: 'https',
	http: 'h2', /*options: {allowHTTP1: true},*/ settings: {enableConnectProtocol: true},
	cert: 'C:/Users/MAKS11060/.certs/maks11060.keenetic.link/cert.pem',
	key: 'C:/Users/MAKS11060/.certs/maks11060.keenetic.link/privkey.pem',
})
	.listen(40443)

route.use(await import('./api.js'))
route.use(await import('./proxy.js'))
