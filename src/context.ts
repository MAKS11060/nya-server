import http from 'http'
import http2, {ServerStreamResponseOptions} from 'http2'
import {TLSSocket} from 'tls'
import Duplexify from 'duplexify'
import mime from 'mime'
import {ContentType, Header, SocketInfo} from './interface/context.js'
import {Cookie} from './components/cookie.js'
import {Body} from './components/body.js'
import {App} from './index.js'

export class ContextHTTP {
	readonly req: http.IncomingMessage
	readonly res: http.ServerResponse
	readonly stream: Duplexify.Duplexify
	readonly uri: URL

	header: Header = {}

	private _pipe: boolean
	private _sent: boolean

	constructor(req: http.IncomingMessage, res: http.ServerResponse) {
		this.req = req
		this.res = res
		this.stream = new Duplexify(res, req)
		this.uri = this.encrypted ?
			new URL(req.url, `https://${this.headers.host}`) :
			new URL(req.url, `http://${this.headers.host}`)

		Object.defineProperties(this, {
			_pipe: {value: false, writable: true},
			_send: {value: false, writable: true},
		})

		this.stream.once('pipe', () => this.respond())
		this.stream.on('pipe', () => this._pipe = true)
		this.stream.on('unpipe', () => this._pipe = false)
	}

	get socket(): TLSSocket {
		return <TLSSocket>this.res.socket
	}

	get encrypted(): boolean {
		return this.req.socket instanceof TLSSocket ? this.req.socket.encrypted : false
	}

	get headers(): http.IncomingHttpHeaders {
		return this.req.headers
	}

	get method(): string {
		return this.req.method
	}

	get statusCode(): number {
		return +this.header?.[':status'] || 200
	}

	get isRespond(): boolean {
		return this.res.headersSent
	}

	get isSent(): boolean {
		return this._sent
	}

	get isPipe(): boolean {
		return this._pipe
	}

	respond(headers?: any): this {
		if (this.isRespond) return this
		// if (this.cookie.size) this.header['set-cookie'] = this.cookie.toArray()
		const {':status': _, ...header} = this.header
		this.res.writeHead(this.statusCode, {...header, ...headers})
	}

	send(data?: Buffer | string | undefined | null, holdStream?: boolean): void {
		data = typeof data === 'string' ?
			Buffer.from(data) : Buffer.isBuffer(data) ?
				data : Buffer.from('')

		if (!this.isSent && !holdStream) this.header['content-length'] = data.byteLength

		if (this.stream.writable && !this.isPipe) {
			if (!this.isSent) this.respond()

			if (this.statusCode === 204 || this.statusCode === 304) return this.stream.end()

			holdStream ? this.stream.write(data) : this.stream.end(data)

			// if (!holdStream && this.autoClose)
			// this.stream.end(data)
			// else {
			// 	this.stream.write(data)
			// 	this._autoClose = false
			// }
		}

		this._sent = true

		// ?? Ok
		if (this.method === 'HEAD') {
			this.respond()
			this.stream.end()
			return
		}
	}
}

export class ContextHTTP2 {
	readonly stream: http2.ServerHttp2Stream
	readonly headers: http2.IncomingHttpHeaders
	readonly uri: URL

	header: Header = {}

	private _pipe: boolean
	private _sent: boolean

	constructor(stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) {
		this.stream = stream
		this.headers = headers
		this.uri = new URL(
			headers[':path'].replace(/\/+$/, '') || '/',
			`${headers[':scheme']}://${headers[':authority'] || headers['host']}`
		)

		Object.defineProperties(this, {
			_pipe: {value: false, writable: true},
			_send: {value: false, writable: true},
		})

		this.stream.once('pipe', () => this.respond())
		this.stream.on('pipe', () => this._pipe = true)
		this.stream.on('unpipe', () => this._pipe = false)
	}

	get socket(): TLSSocket {
		return <TLSSocket>this.stream.session.socket
	}

	get encrypted(): boolean {
		return true
	}

	get method(): string {
		return this.headers[':method']
	}

	get statusCode(): number {
		return +this.header?.[':status'] || 200
	}

	get isRespond(): boolean {
		return this.stream.headersSent
	}

	get isSent(): boolean {
		return this._sent
	}

	get isPipe(): boolean {
		return this._pipe
	}

	respond(headers?: Header, options?: ServerStreamResponseOptions): this {
		if (this.isRespond) return this
		this.stream.respond({...this.header, ...headers}, options)
	}

	send(data?: string | Buffer | undefined | null, holdStream?: boolean): void {
		data = typeof data === 'string' ?
			Buffer.from(data) : Buffer.isBuffer(data) ?
				data : Buffer.from('')

		if (!this.isSent) this.header['content-length'] = data.byteLength

		if (this.stream.writable && !this.isPipe) {
			if (!this.isSent) this.respond()

			if (this.statusCode === 204 || this.statusCode === 304)
				return this.stream.end()

			holdStream ? this.stream.write(data) : this.stream.end(data)

			// if (!holdStream/* && this.autoClose*/)
			// this.stream.end(data)
			// else {
			// 	this.stream.write(data)
			// 	this._autoClose = false
			// }
		}

		this._sent = true

		// ?? Ok
		if (this.method === 'HEAD') {
			this.respond()
			this.stream.end()
			return
		}
	}
}

export class Context {
	next: any
	params: Map<string, string>

	private app: App
	private base: ContextHTTP | ContextHTTP2

	private _holdStream: boolean

	constructor(app: App, base: ContextHTTP | ContextHTTP2) {
		Object.defineProperty(this, 'app', {writable: false, value: app})
		Object.defineProperty(this, 'base', {writable: false, enumerable: false, value: base})

		Object.defineProperty(this, 'params', {writable: true, enumerable: true})

		Object.defineProperty(this, '_holdStream', {writable: true, enumerable: false})
		Object.defineProperty(this, '_cookie', {writable: true, enumerable: false})
		Object.defineProperty(this, '_body', {writable: true, enumerable: false})
	}

	get appOptions() {
		return Object.assign({}, this.app.options)
	}

	private _body: Body

	get body(): Body {
		if (!this._body)
			Object.defineProperty(this, '_body', {enumerable: false, value: new Body(this)})
		return this._body
	}

	private _cookie: Cookie

	get cookie(): Cookie {
		if (!this._cookie)
			Object.defineProperty(this, '_cookie', {enumerable: false, value: new Cookie(this.headers?.cookie)})
		return this._cookie
	}

	get cookies(): Map<string, string> {
		return this.cookie.cookies
	}

	get encrypted(): boolean {
		return this.base.encrypted
	}

	get socketInfo(): SocketInfo {
		const socket = this.base.socket
		return {
			remoteFamily: socket.remoteFamily,
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			localAddress: socket.localAddress,
			localPort: socket.localPort,
		}
	}

	get headers() {
		return this.base.headers
	}

	get method(): string {
		return this.base.method
	}

	get uri(): URL {
		return this.base.uri
	}

	get pathname(): string {
		return this.uri.pathname
	}

	get query(): URLSearchParams {
		return this.uri.searchParams
	}

	get header(): Header {
		return this.base.header
	}

	get statusCode(): number {
		return +this.header?.[':status'] || 200
	}

	get stream() {
		return this.base.stream
	}

	get isSent(): boolean {
		return this.base.isSent
	}

	get isPipe(): boolean {
		return this.base.isPipe
	}

	get isRespond(): boolean {
		return this.base.isRespond
	}

	get isHoldStream(): boolean {
		return this._holdStream
	}

	// Set status code
	status(code: number): this {
		this.header[':status'] = code
		return this
	}

	// Send headers to client
	respond(headers?: Header): this {
		if (this.cookie.size) this.header['set-cookie'] = this.cookie.toArray()
		return this
	}

	// Set content type
	type(contentType: ContentType): this {
		this.header['content-type'] = contentType
		return this
	}

	// use mime.getType("/file.ext") and ctx.type(...)
	mimeType(path: string): this {
		this.type(mime.getType(path))
		return this
	}

	// ctx.respond() and Send Data to client
	send(data?: string | Buffer | undefined | null, holdStream?: boolean): void {
		this.respond()
		this._holdStream = holdStream ?? this._holdStream
		this.base.send(data, this.isHoldStream)
	}

	// Set ctx.type('text/html') and send(...)
	html(data: string | Buffer): void {
		this.type('text/html; charset=utf-8')
		this.send(data)
	}

	// Set ctx.type('text/plain') and send(...)
	text(data: string | Buffer | undefined): void {
		this.type('text/plain; charset=utf-8')
		this.send(data)
	}

	// ctx.type('application/json') and send(JSON.stringify({...}))
	json(data: object, replacer?: ((this: any, key: string, value: any) => any) | undefined, space?: string | number | undefined): void {
		this.type('application/json')
		this.send(Buffer.from(JSON.stringify(data, replacer, space)))
	}
}

export type Middleware = (ctx: Context) => void
