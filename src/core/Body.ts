import {parse as qsParse} from 'node:querystring'
import {Readable} from 'node:stream'
import {buffer} from 'node:stream/consumers'
import {HTTPError} from './HTTPError.js'
import {ContentType} from './types.js'

export class Body {
	constructor(private readonly stream: Readable, readonly size: number, readonly type?: string) {
	}

	// Compare Content-Type and throw HTTPError
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

	async urlencoded(size?: number) {
		this.checkType(ContentType.urlencoded)
		return this.buffer(size)
			.then(buf => buf && buf.toString())
			.then(str => str && qsParse(str))
	}

	async json<T extends unknown>(size?: number) {
		this.checkType(ContentType.json)
		return this.buffer(size)
			.then(buf => buf && buf.toString())
			.then(val => val && JSON.parse(val) as T)
			.catch(reason => {
				throw new HTTPError('Bad Request', {error: 'Invalid JSON'})
			})
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
