import qs, {ParsedUrlQuery} from 'querystring'
import {Stream} from 'stream'
import {Context} from './context.js'
import {StatusError} from '../lib/error.js'

export type BodyOptions = {
	bodySize: number
}

export class Body {
	private readonly options: BodyOptions = {
		bodySize: 1024 * 512
	}

	private ctx: Context
	private bodyUsed: boolean = false

	constructor(ctx: Context) {
		this.options.bodySize = ctx.app.options.bodySize
		this.ctx = ctx
	}

	private _allowGETBody: boolean = false

	get allowGETBody(): boolean {
		return this._allowGETBody
	}

	set allowGETBody(value: boolean) {
		this._allowGETBody = value
	}

	set size(value: number) {
		this.options.bodySize = value
	}

	private static getPromiseBody(stream: Stream, size: number, maxBodySize: number): Promise<Buffer> {
		if (!size) throw new StatusError(411)

		return new Promise<Buffer>((resolve, reject) => {
			let readBytes = 0
			let buf = []

			stream.on('data', (chunk: Buffer) => {
				readBytes += chunk.byteLength
				if (readBytes <= size) buf.push(chunk)
				else if (readBytes != size) // readBytes != size
					buf = []
			})
			stream.once('end', () => {
				// console.log(`end: size ${size} readBytes ${readBytes} limit ${maxBodySize}`)
				readBytes == size && readBytes <= maxBodySize ?
					resolve(Buffer.concat(buf)) :
					reject(new StatusError(413))
			})

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
