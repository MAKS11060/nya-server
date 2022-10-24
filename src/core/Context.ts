import http from 'http'
import {IncomingHttpHeaders, ServerHttp2Stream} from 'http2'
import {AddressInfo} from 'net'
import {TLSSocket} from 'tls'
import {Body} from './Body.js'
import {Cookie} from './Cookie.js'
import {HTTPError} from './HTTPError.js'
import {ContentType, HTTPMethod, RouteParams, Status, StatusCode} from './types.js'

type HttpVersion = '0.9' | '1.0' | '1.1' | '2.0'

export interface BaseContext<M extends HTTPMethod> {
	readonly httpVersion: HttpVersion
	readonly addr: AddressInfo

	readonly method: M
	readonly uri: URL
	readonly headers: http.IncomingHttpHeaders
	readonly body: Body // Body

	readonly isRespond: boolean
	readonly isSent: boolean
	readonly isPipe: boolean

	statusCode: number
	header: Headers

	status(code: number): void

	respond(headers?: http.OutgoingHttpHeaders): void

	send(data: Buffer, isHoldStream?: boolean): void
}

export class ContextHTTP1<M extends HTTPMethod, P extends RouteParams<string>> implements BaseContext<M> {
	readonly req: http.IncomingMessage
	readonly res: http.ServerResponse
	readonly uri: URL
	readonly body: Body

	statusCode: number = 200
	header: Headers = new Headers()

	private _pipe: boolean = false
	private _sent: boolean = false

	constructor(req: http.IncomingMessage, res: http.ServerResponse) {
		this.req = req
		this.res = res
		if (!this.headers.host) throw new HTTPError('Bad Request')
		this.uri = this.encrypted ?
			new URL(req.url ?? '/', `https://${this.headers.host}`) :
			new URL(req.url ?? '/', `http://${this.headers.host}`)
		this.body = new Body(req, Number(this.headers['content-length']), this.headers['content-type'])
	}

	get httpVersion(): HttpVersion {
		return this.req.httpVersion as HttpVersion
	}

	get encrypted(): boolean {
		return this.req.socket instanceof TLSSocket
	}

	get addr(): AddressInfo {
		// if (!this.res.socket) return null
		return {
			address: this.res.socket?.remoteAddress || '',
			family: this.res.socket?.remoteFamily || '',
			port: this.res.socket?.remotePort || 0,
		}
	}

	get method(): M {
		return this.req.method as M
	}

	get headers(): http.IncomingHttpHeaders {
		return this.req.headers
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

	status(code: number): void {
		this.statusCode = code
	}

	respond(headers?: http.OutgoingHttpHeaders): void {
		if (this.isRespond) return
		this.res.writeHead(this.statusCode, {
			...Object.fromEntries(this.header.entries()),
			...headers,
		})
	}

	send(data: Buffer, holdStream?: boolean): void {
		if (this.res.destroyed) return

		// set content len
		if (!this.isSent && !holdStream) this.header.set('content-length', data.byteLength.toString())

		if (!this.res.writableEnded && !this.isPipe) {
			if (!this.isSent) this.respond()

			// if required empty body
			if (this.statusCode === 204 || this.statusCode === 304) {
				this.res.end()
				return
			}

			// prevent close stream
			holdStream ? this.res.write(data) : this.res.end(data)
		}

		this._sent = true

		// if res.writable == false and method == HEAD,
		// response header without body
		if (this.method === 'HEAD') {
			this.respond()
			this.res.end()
			return
		}
	}
}

export class ContextHTTP2<M extends HTTPMethod, P extends RouteParams<string>> implements BaseContext<M> {
	readonly stream: ServerHttp2Stream
	readonly headers: IncomingHttpHeaders
	readonly uri: URL
	readonly body: Body

	statusCode: number = 200
	header: Headers = new Headers()

	private _pipe: boolean = false
	private _sent: boolean = false

	constructor(stream: ServerHttp2Stream, headers: IncomingHttpHeaders) {
		this.stream = stream
		this.headers = headers
		this.uri = new URL(
			headers[':path']?.replace(/\/+$/, '') || '/',
			`${headers[':scheme']}://${headers[':authority'] || headers['host']}`,
		)
		this.body = new Body(stream, Number(headers['content-length']), headers['content-type'])

		this.stream.once('pipe', () => this.respond())
		this.stream.on('pipe', () => this._pipe = true)
		this.stream.on('unpipe', () => this._pipe = false)
	}

	get httpVersion(): HttpVersion {
		return '2.0'
	}

	get addr(): AddressInfo {
		// if (this.stream?.session?.socket) return null
		return {
			address: this.stream.session.socket.remoteAddress || '',
			family: this.stream.session.socket.remoteFamily || '',
			port: this.stream.session.socket.remotePort || 0,
		}
	}

	get method(): M {
		return this.headers[':method'] as M
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

	status(code: number): void {
		this.statusCode = code
	}

	respond(headers?: http.OutgoingHttpHeaders): void {
		if (this.isRespond) return
		this.stream.respond({
			':status': this.statusCode,
			...Object.fromEntries(this.header.entries()),
			...headers,
		})
	}

	send(data: Buffer, holdStream?: boolean) {
		if (this.stream.destroyed) return
		if (undefined === data) data = Buffer.from('')
		// set content len
		if (!this.isSent && !holdStream) this.header.set('content-length', data.byteLength.toString())

		if (!this.stream.writableEnded && !this.isPipe) {
			if (!this.isSent) this.respond()

			// if required empty body
			if (this.statusCode === 204 || this.statusCode === 304) return this.stream.end()

			// prevent close stream
			holdStream ? this.stream.write(data) : this.stream.end(data)
		}

		this._sent = true

		// if res.writable == false and method == HEAD,
		// response header without body
		if (this.method === 'HEAD') {
			this.respond()
			this.stream.end()
			return
		}
	}
}

export class Context<M extends HTTPMethod, P extends RouteParams<string>> {
	readonly params: P

	private readonly context: BaseContext<M>
	private _holdStream: boolean = false

	constructor(baseContext: BaseContext<M>) {
		this.context = baseContext
		this.params = {} as P
	}

	get isRespond(): boolean {
		return this.context.isRespond
	}

	get isSent(): boolean {
		return this.context.isSent
	}

	get isPipe(): boolean {
		return this.context.isPipe
	}

	get isHoldStream(): boolean {
		return this._holdStream
	}

	get httpVersion(): HttpVersion {
		return this.context.httpVersion
	}

	get addr(): AddressInfo {
		return this.context.addr
	}

	get method(): M {
		return this.context.method
	}

	get uri(): URL {
		return this.context.uri
	}

	get headers() {
		return this.context.headers
	}

	get cookies() {
		// return Cookie.Parse(this.headers)
		return Cookie.Parse(this.headers)
	}

	get cookie() {
		return Cookie.Init()
	}

	get body(): Body {
		return this.context.body
	}

	get pathname(): string {
		return this.uri.pathname
	}

	get query(): URLSearchParams {
		return this.uri.searchParams
	}

	get header(): Headers {
		return this.context.header
	}

	static getBaseContext(context: Context<any, any>) {
		return context.context
	}

	status(code: Status | number) {
		if (typeof code == 'string' && StatusCode[code]) {
			this.context.status(StatusCode[code])
		} else if (typeof code === 'number') {
			this.context.status(code)
		}
		return this
	}

	send(data?: unknown, holdStream?: boolean) {
		if (!this.header.has('content-type') && this.method != 'CONNECT') this.detectType(data)

		this.respond()
		this._holdStream = holdStream ?? this._holdStream
		this.context.send(this.toBuffer(data), this.isHoldStream)
	}

	type(contentType: string | ContentType) {
		this.header.set('content-type', contentType)
	}

	// Set ctx.type('text/html') and send(...)
	html(data: string | Buffer): void {
		this.type(ContentType.html)
		this.send(data)
	}

	// Set ctx.type('text/plain') and send(...)
	text(data: string | Buffer | undefined): void {
		this.type(ContentType.text)
		this.send(data)
	}

	// ctx.type('application/json') and send(JSON.stringify({...}))
	json(data: any, space?: string | number | undefined): void {
		this.type(ContentType.json)
		this.send(Buffer.from(JSON.stringify(data, null, space)))
	}

	respond() {
		if (this.cookie.size) this.context.respond({'set-cookie': this.cookie.toArray()})
		return this
	}

	private detectType(data: unknown) {
		if (typeof data == 'object') {
			if (Buffer.isBuffer(data)) return this.type(ContentType.bin)
			if (data instanceof Response) return this.type(ContentType.text)
			return this.type(ContentType.json)
		}

		if (typeof data == 'string') return this.type(ContentType.text)
		if (typeof data == 'number' || typeof data == 'boolean') return this.type(ContentType.json)
		if (typeof data == 'bigint') return this.type(ContentType.text)
	}

	private toBuffer(data: unknown): Buffer {
		if (undefined === data) return Buffer.from('')
		if (typeof data == 'object') {
			if (Buffer.isBuffer(data)) return data
			if (data instanceof ArrayBuffer) return Buffer.from(data)
			return Buffer.from(JSON.stringify(data))
		}

		if (typeof data == 'string') return Buffer.from(data)
		if (typeof data == 'number' || typeof data == 'boolean') {
			return Buffer.from(JSON.stringify(data))
		}
		if (typeof data == 'bigint') return Buffer.from(data.toString())

		return Buffer.from('') // guaranteed return Buffer
	}
}
