import {Context} from '../context.js'
import qs, {ParsedUrlQuery} from 'querystring'
import bytes from 'bytes'


export interface IBody {
	bodyUsed: boolean

	json(): Promise<any>

	text(): Promise<string>

	urlencoded(): Promise<ParsedUrlQuery>
}

export class Body implements IBody {
	public bodyUsed: boolean
	private byteLengthLimit: number
	private readonly body: Promise<Buffer>

	constructor(ctx: Context, limit: string | number = '10mb') {
		this.limit = limit

		const {stream, headers: {'content-length': size}} = ctx
		this.body = new Promise<Buffer>((resolve, reject) => {
			let bytesRead = 0
			let buf = []

			if (!+size) ctx.status(411).send(`411 - Length Required`)

			stream.on('data', (chunk: Buffer) => {
				bytesRead += chunk.byteLength

				if (this.byteLengthLimit >= bytesRead) buf.push(chunk)
				else ctx.status(411).send(`413 - Payload Too Large`)

				if (+size === bytesRead) stream.emit('end')
			})
			stream.once('end', () => resolve(Buffer.concat(buf)))
			stream.once('error', err => reject(err))
		})
	}

	get limit() {
		return this.byteLengthLimit
	}

	set limit(val: string | number) {
		this.byteLengthLimit = bytes.parse(val)
	}

	static create(ctx: Context, limit?: string | number) {
		return new this(ctx, limit)
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
}
