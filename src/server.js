import {createServer} from 'http'
import {createSecureServer} from "http2"
import fs from "fs"
import path from "path"

export const createHTTP = (handler) => {
	return createServer(handler)
}

export const createTLS = (handler) => {
	const serv = createSecureServer({
		allowHTTP1: true,
		key: fs.readFileSync(path.join(process.env.HOMEPATH, '.certs/maks11060.keenetic.link/privkey.pem')),
		cert: fs.readFileSync(path.join(process.env.HOMEPATH, '.certs/maks11060.keenetic.link/fullchain.pem'))
	}).listen(443)
	serv.on('request', app.handler.callback())
	
}