import http from 'http'
import https from 'https'
import http2 from 'http2'
import {App} from './app.js'

export class Server {
	static HTTP(app: App): http.Server {
		return http.createServer(app.handler.requestListener)
	}

	static HTTPS(app: App, options: https.ServerOptions): https.Server {
		return https.createServer(options, app.handler.requestListener)
	}

	static HTTP2(app: App, options: http2.SecureServerOptions): http2.Http2SecureServer {
		return http2.createSecureServer({settings: {enableConnectProtocol: true /*ws on http2*/}, ...options})
			.on('stream', app.handler.onStream)
			.on('unknownProtocol', app.handler.onUnknownProtocol)
	}
}