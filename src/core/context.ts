import http from 'http'
import Duplexify from 'duplexify'
import {TLSSocket} from 'tls'
import http2, {ServerStreamResponseOptions} from 'http2'
import {Body} from './body.js'
import {Cookie} from './cookie.js'
import mime from 'mime'
import {App} from './app.js'

//=======
export type SocketInfo = {
	remoteFamily: string
	remoteAddress: string
	remotePort: number
	localAddress: string
	localPort: number
}

export type Method = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH'

type StatusCode_Information = 100 | 101 | 102
type StatusCode_Successful = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226
type StatusCode_Redirection = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308
type StatusCode_ClientError = 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413
	| 414 | 415 | 416 | 417 | 418 | 420 | 422 | 423 | 424 | 425 | 426 | 428 | 429 | 431 | 444 | 449 | 450 | 451 | 499
type StatusCode_ServerError = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 509 | 510 | 511 | 598 | 599
export type StatusCode = StatusCode_Information | StatusCode_Successful
	| StatusCode_Redirection | StatusCode_ClientError | StatusCode_ServerError

export type ContentType = string
	| 'text/plain' | 'text/html' | 'text/css' | 'text/javascript' | 'text/event-stream'
	| 'application/json' | 'application/javascript' | 'application/x-www-form-urlencoded' | 'application/octet-stream'
	| 'image/jpeg' | 'image/png' | 'image/gif' | 'image/svg+xml' | 'image/webp' | 'image/avif'
	| 'audio/wave' | 'audio/wav' | 'audio/webm' | `audio/mpeg` | `audio/vorbis` | `audio/ogg`
	| 'video/webm' | 'video/mp4'
	| 'font/woff' | 'font/ttf' | 'font/otf'
	| 'multipart/form-data'

type ExtendedHeader =
	Record<'content-type', ContentType> &
	Record<':status', StatusCode>

export type Header = ExtendedHeader &
	http.OutgoingHttpHeaders |
	http.IncomingHttpHeaders

//=======
interface ContextBase<M extends Method = Method> {
	readonly socket: TLSSocket
	readonly stream: Duplexify.Duplexify | http2.ServerHttp2Stream

	readonly uri: URL
	readonly encrypted: boolean
	readonly headers: http.IncomingHttpHeaders
	readonly method: M
	readonly header: Header
	readonly statusCode: number

	readonly isRespond: boolean
	readonly isSent: boolean
	readonly isPipe: boolean

	respond(headers?: any): this

	send(data?: Buffer | string | undefined | null, holdStream?: boolean): void
}

class ContextHTTP implements ContextBase {
	readonly req: http.IncomingMessage
	readonly res: http.ServerResponse
	readonly stream: Duplexify.Duplexify
	readonly uri: URL
	readonly header: Header = {}

	private _pipe: boolean
	private _sent: boolean

	constructor(req: http.IncomingMessage, res: http.ServerResponse) {
		Object.defineProperties(this, {
			req: {value: req, enumerable: false},
			res: {value: res, enumerable: false},
			stream: {value: new Duplexify(res, req), enumerable: false},

			_pipe: {value: false, writable: true, enumerable: false},
			_sent: {value: false, writable: true, enumerable: false},
		})

		this.uri = this.encrypted ?
			new URL(req.url, `https://${this.headers.host}`) :
			new URL(req.url, `http://${this.headers.host}`)

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

	get method(): Method {
		return <Method>this.req.method
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
		if (this.stream.destroyed) return

		data = typeof data === 'string' ?
			Buffer.from(data) : Buffer.isBuffer(data) ?
				data : Buffer.from('')

		if (!this.isSent && !holdStream) this.header['content-length'] = data.byteLength

		if (this.stream.writable && !this.isPipe) {
			if (!this.isSent) this.respond()

			if (this.statusCode === 204 || this.statusCode === 304) return this.stream.end()

			holdStream ? this.stream.write(data) : this.stream.end(data)
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

class ContextHTTP2 implements ContextBase {
	readonly stream: http2.ServerHttp2Stream
	readonly headers: http2.IncomingHttpHeaders
	readonly uri: URL
	readonly header: Header = {}

	private _pipe: boolean
	private _sent: boolean

	constructor(stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) {
		Object.defineProperties(this, {
			stream: {value: stream, writable: false, enumerable: false},
			headers: {value: headers, writable: false, enumerable: false},
			_pipe: {value: false, writable: true, enumerable: false},
			_sent: {value: false, writable: true, enumerable: false},
		})

		this.uri = new URL(
			headers[':path'].replace(/\/+$/, '') || '/',
			`${headers[':scheme']}://${headers[':authority'] || headers['host']}`
		)

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

	get method(): Method {
		return <Method>this.headers[':method']
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
		if (this.stream.destroyed) return

		data = typeof data === 'string' ?
			Buffer.from(data) : Buffer.isBuffer(data) ?
				data : Buffer.from('')

		if (!this.isSent) this.header['content-length'] = data.byteLength

		if (this.stream.writable && !this.isPipe) {
			if (!this.isSent) this.respond()

			if (this.statusCode === 204 || this.statusCode === 304)
				return this.stream.end()

			holdStream ? this.stream.write(data) : this.stream.end(data)
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

export class Context<M extends Method = Method, P extends string = string> {
	readonly params: Record<P, string>

	readonly app: App
	private baseContext: ContextBase
	private _holdStream: boolean

	private constructor(app: App, context: ContextBase) {
		Object.defineProperties(this, {
			app: {value: app, writable: false},
			baseContext: {value: context, writable: false, enumerable: false},

			params: {writable: true, enumerable: true},

			_holdStream: {writable: true, enumerable: false},
			_cookie: {writable: true, enumerable: false},
			_body: {writable: true, enumerable: false},
		})
	}

	get method(): M {
		return <M>this.baseContext.method
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
		return this.baseContext.encrypted
	}

	get socketInfo(): SocketInfo {
		const socket = this.baseContext.socket
		return {
			remoteFamily: socket.remoteFamily,
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			localAddress: socket.localAddress,
			localPort: socket.localPort,
		}
	}

	get headers() {
		return this.baseContext.headers
	}

	get uri(): URL {
		return this.baseContext.uri
	}

	get pathname(): string {
		return this.uri.pathname
	}

	get query(): URLSearchParams {
		return this.uri.searchParams
	}

	get header(): Header {
		return this.baseContext.header
	}

	get statusCode(): number {
		return +this.header?.[':status'] || 200
	}

	get stream() {
		return this.baseContext.stream
	}

	get isSent(): boolean {
		return this.baseContext.isSent
	}

	get isPipe(): boolean {
		return this.baseContext.isPipe
	}

	get isRespond(): boolean {
		return this.baseContext.isRespond
	}

	get isHoldStream(): boolean {
		return this._holdStream
	}

	static HTTP(app: App, req: http.IncomingMessage, res: http.ServerResponse) {
		const baseContext = new ContextHTTP(req, res)
		return new this(app, baseContext)
	}

	static HTTP2(app: App, stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders) {
		const baseContext = new ContextHTTP2(stream, headers)
		return new this(app, baseContext)
	}

	// Set status code
	status(code: StatusCode): this {
		this.header[':status'] = code
		return this
	}

	// Send headers to client
	respond(headers?: Header): this {
		Object.assign(this.header, headers)
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
		this.baseContext.send(data, this.isHoldStream)
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
	json(data: any, replacer?: ((this: any, key: string, value: any) => any) | undefined, space?: string | number | undefined): void {
		this.type('application/json')
		this.send(Buffer.from(JSON.stringify(data, replacer, space)))
	}
}
