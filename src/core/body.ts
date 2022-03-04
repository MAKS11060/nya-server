import qs, {ParsedUrlQuery} from 'querystring'
import {Stream} from 'stream'
import {Context} from './context.js'

export type BodyOptions = {
	bodySize: number
}

export class Body {
	private readonly options: BodyOptions = {
		bodySize: 1024 * 512
	}

	private ctx: Context
	private bodyUsed: boolean = false
	private _allowGETBody: boolean = false

	constructor(ctx: Context) {
		this.options.bodySize = ctx.app.options.bodySize
		this.ctx = ctx
	}

	set size(value: number) {
		this.options.bodySize = value
	}

	get allowGETBody(): boolean {
		return this._allowGETBody
	}
	set allowGETBody(value: boolean) {
		this._allowGETBody = value
	}

	private static getPromiseBody(stream: Stream, size: number, maxBodySize: number): Promise<Buffer> {
		if (!size) throw new Error('411 Content Length is Required')

		return new Promise<Buffer>((resolve, reject) => {
			let bytesRead = 0
			let buf = []

			stream.on('data', (chunk: Buffer) => {
				bytesRead += chunk.byteLength

				if (maxBodySize >= bytesRead) buf.push(chunk)
				else reject(new Error('Payload Too Large'))

				if (+size === bytesRead) stream.emit('end')
			})
			stream.once('end', () => resolve(Buffer.concat(buf)))
			stream.once('error', err => reject(err))
		})
	}

	buffer(): Promise<Buffer> {
		if (!this.allowGETBody && this.ctx.method == 'GET') return
		return Body.getPromiseBody(this.ctx.stream, +this.ctx.headers['content-length'], this.options.bodySize)
	}

	text(encoding?: BufferEncoding): Promise<string> {
		this.bodyUsed = true
		return this.buffer()
			.then(value => value.toString(encoding))
	}

	json(): Promise<any> {
		this.bodyUsed = true
		return this.buffer()
			.then(value => JSON.parse(value.toString()))
	}

	urlencoded(): Promise<ParsedUrlQuery> {
		this.bodyUsed = true
		return this.buffer()
			.then(value => qs.parse(value.toString()))
	}
}
