import {constants, IncomingHttpHeaders, ServerHttp2Stream, ServerStreamResponseOptions} from 'http2'
import {OutgoingHttpHeaders} from 'http'
import {Cookie} from './components/cookie.js'
import {Body} from './components/body.js'
import mime from 'mime'


type ContentType = string
	| 'text/plain'
	| 'text/html'
	| 'text/css'
	| 'text/event-stream'
	| 'application/json'
	| 'application/javascript'
	| 'application/x-www-form-urlencoded'
	| 'multipart/form-data'

export type IUserContext = {}

export interface IContext extends IUserContext {
	stream: ServerHttp2Stream
	headers: IncomingHttpHeaders
	url: URL

	method: string
	pathname: string
	query: URLSearchParams

	state: NodeJS.Dict<any>

	params: NodeJS.Dict<string>
	next: unknown

	header: OutgoingHttpHeaders
	statusCode: number

	readonly body: Body
	piped: boolean

	cookies: Map<string, string>
	cookie: Cookie

	respond(headers?: OutgoingHttpHeaders, options?: ServerStreamResponseOptions): this

	status(code: number): this

	type(type: ContentType): this

	mimeType(filename: string): this

	send(data?: string | Buffer | undefined | null): void

	html(data?: string | Buffer): void

	text(data?: string | Buffer): void

	json(data: object, replacer?: (this: any, key: string, value: any) => any, space?: string | number): void
}

export class Context implements IContext {
	stream: ServerHttp2Stream
	headers: IncomingHttpHeaders
	url: URL

	params = {}
	state = {}
	next: unknown

	header: OutgoingHttpHeaders = {}

	_piped: boolean = false
	_statusCode: number = 200

	private _body: Body
	private _cookie: Cookie

	constructor(stream: ServerHttp2Stream, headers: IncomingHttpHeaders) {
		this.stream = stream
		this.headers = headers
		this.url = new URL(
			headers[':path'].replace(/\/+$/, '') || '/',
			`${headers[':scheme']}://${headers[':authority'] || headers['host']}`
		)

		this.stream.on('pipe', () => this._piped = true)
		this.stream.on('unpipe', () => this._piped = false)

		this._cookie = Cookie.create(this)
	}

	get cookie(): Cookie {
		return this._cookie
	}
	get cookies(): Map<string, string> {
		return this._cookie.cookies
	}

	get body(): Body {
		if (this._body) return this._body
		return this._body = Body.create(this, '10mb')
	}

	get method(): string {
		return this.headers[':method']
	}

	get pathname(): string {
		return this.url.pathname
	}

	get query(): URLSearchParams {
		return this.url.searchParams
	}

	get piped(): boolean {
		return this._piped
	}

	get statusCode() {
		return this._statusCode
	}

	static create(stream: ServerHttp2Stream, headers: IncomingHttpHeaders): IContext {
		return new this(stream, headers)
	}

	respond(headers?: OutgoingHttpHeaders, options?: ServerStreamResponseOptions): this {
		if (this.cookie.size) this.header[constants.HTTP2_HEADER_SET_COOKIE] = this.cookie.cookie

		if (!this.stream.headersSent) this.stream.respond({
			...this.header,
			...headers
		}, options)
		return this
	}

	status(code: number): this {
		this._statusCode = this.header[constants.HTTP2_HEADER_STATUS] = code
		return this
	}

	type(contentType: ContentType): this {
		this.header[constants.HTTP2_HEADER_CONTENT_TYPE] = contentType
		return this
	}

	mimeType(path: string): this {
		this.type(mime.getType(path))
		return this
	}

	send(data?: string | Buffer | null | undefined) {
		if (typeof data === 'string' || Buffer.isBuffer(data))
			data = Buffer.from(data)
		else data = Buffer.from('')

		this.header[constants.HTTP2_HEADER_CONTENT_LENGTH] = data.byteLength
		if (this.stream.writable && !this.piped) {
			this.respond()

			if (this.statusCode === 204 || this.statusCode === 304)
				return this.stream.end()

			this.stream.end(data)
			return
		}

		// ?? Ok
		if (this.method === 'HEAD') {
			this.respond()
			this.stream.end()
			return
		}
	}

	html(data: string | Buffer | undefined): void {
		this.type('text/html; charset=utf-8')
		this.send(data)
	}

	json(data: object, replacer: ((this: any, key: string, value: any) => any) | undefined, space: string | number | undefined): void {
		this.type('application/json')
		this.send(Buffer.from(JSON.stringify(data, replacer, space)))
	}

	text(data: string | Buffer | undefined): void {
		this.type('text/plain; charset=utf-8')
		this.send(data)
	}
}