import {parse as qsParse} from 'node:querystring'
import {Readable} from 'node:stream'
import {buffer} from 'node:stream/consumers'
import {HTTPError} from './HTTPError.js'
import {ContentType} from './types.js'

export class Body {
	constructor(private readonly stream: Readable, readonly size: number, readonly type?: string) {
	}

	checkType(type: ContentType) {
		if (undefined == this.type
			|| this.type != type
			&& this.type.split('; ')[0] != type.split('; ')[0]) {
			throw new HTTPError('Unsupported Media Type', `Set Content-Type: ${type}`)
		}
	}

	async buffer(size: number = 1024 * 1024) {
		if (this.bodyUsed()) return null

		const body = await buffer(this.stream)
		if (body.byteLength > size) throw new HTTPError('Payload Too Large')
		return body
	}

	async text(size?: number, encoding?: BufferEncoding) {
		this.checkType(ContentType.text)
		return this.buffer(size)
			.then(v => v ? v.toString(encoding) : null)
	}

	async json<T extends unknown>(size?: number) {
		this.checkType(ContentType.json)
		return this.text(size)
			.then(val => val && JSON.parse(val) as T)
	}

	async urlencoded(size?: number) {
		this.checkType(ContentType.urlencoded)
		return this.text(size)
			.then(val => val && qsParse(val))
	}

	// async formData(size?: number) {
	// 	this.checkType(ContentType.formData)
	// 	return this.buffer(size)
	// 		.then(val => new Multipart(this.type, val).toFormData())
	// }

	private bodyUsed(): boolean {
		return this.stream.readableEnded
	}
}
