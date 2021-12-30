import qs, {ParsedUrlQuery} from 'querystring'
import {Stream} from 'stream'
import {Context} from '../context.js'

export type BodyOptions = {
	maxBodySize: number
}

export class Body {
	options: BodyOptions = {
		maxBodySize: 1024 * 512
	}

	private body: Promise<Buffer>
	private bodyUsed: boolean = false

	constructor(ctx: Context) {
		for (const optionsKey in this.options) {
			if (ctx.appOptions?.[optionsKey]) this.options[optionsKey] = ctx.appOptions[optionsKey]
		}

		const size = +ctx.headers['content-length']
		if (size) {
			this.body = Body.getPromiseBody(ctx.stream, size, this.options.maxBodySize)
		} else throw new Error('411 Content Length is Required')
	}

	static getPromiseBody(stream: Stream, size: number, maxBodySize: number): Promise<Buffer> {
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

	text(encoding?: BufferEncoding): Promise<string> {
		this.bodyUsed = true
		return this.body.then(value => value.toString(encoding))
	}

	json(): Promise<any> {
		this.bodyUsed = true
		return this.body.then(value => JSON.parse(value.toString()))
	}

	urlencoded(): Promise<ParsedUrlQuery> {
		this.bodyUsed = true
		return this.body.then(value => qs.parse(value.toString()))
	}

	async buffer(): Promise<Buffer> {
		return this.body
	}
}
