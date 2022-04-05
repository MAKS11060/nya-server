type ParseOption = {
	maxSize?: number
	maxFileSize?: number
}

type File = {
	name: string
	filename: string
	type: string
	body: Buffer
}

type Field = {
	name: string
	type: string
	body: Buffer
}

export class Multipart {
	private readonly cache = []

	constructor(body: Buffer, boundary: string) {
		this.parse(body, boundary)
		// const d = await ctx.body.buffer()
		// Multipart.getBoundary(ctx.headers['content-type'])
	}

	private parse(body: Buffer, boundary: string) {
		let step = 0
		let val = ''
		let buf = []

		let contentDisposition = ''
		let contentType = ''

		for (let i = 0; i < body.length; i++) {
			const c = body[i]
			const prevByte = i > 0 ? body[i - 1] : null

			// LF and CR detect
			const newLineChar: boolean = c === 0x0a || c === 0x0d
			const newLineDetected: boolean = c === 0x0a && prevByte === 0x0d

			// concat data
			if (!newLineChar) val += String.fromCharCode(c)

			// find boundary
			if (step == 0 && newLineDetected) {
				if ('--' + boundary == val) step = 1
				val = ''
				continue
			}

			// content disposition
			if (step == 1 && newLineDetected) {
				contentDisposition = val
				val = ''
				step = 2
				// if (contentDisposition.indexOf('filename') === -1) step = 3 //WFT
				continue
			}
			// content type
			if (step == 2 && newLineDetected) {
				contentType = val
				val = ''
				step = 3
				continue
			}

			if (step == 3 && newLineDetected) {
				buf = []
				val = ''
				step = 4
				continue
			}

			// parse part
			if (step == 4) {
				if (val.length > boundary.length + 4) val = ''
				if ('--' + boundary === val) {
					const body = Buffer.from(buf.slice(0, buf.length - val.length - 1))
					const name = JSON.parse(contentDisposition.split(';').map(v => v.trim())[1].split('=')[1])
					const filename = JSON.parse(contentDisposition.split(';').map(v => v.trim())[2]?.split('=')[1] || null)
					const type = contentType.split(':').map(v => v.trim())[1]

					this.cache.push({filename, name, type, body})

					// cleanup
					contentDisposition = ''
					contentType = ''
					buf = []
					val = ''
					step = 5
				} else buf.push(c)
				if (newLineDetected) val = ''
				continue
			}

			// move to start
			if (step == 5 && newLineDetected) step = 1
		}
	}

	get files(): File[] {
		return this.cache.filter(value => value.filename && value.body)
	}

	get fields(): Field[] {
		return this.cache.filter(value => !value.filename && value.body)
	}

	get set(): Set<File | Field> {
		return new Set(this.cache)
	}

	static getBoundary(header: string): string {
		let str = ''
		for (const item of header.split(';')) {
			const str = item.trim()
			if (str.toLowerCase() == 'multipart/form-data') continue
			if (str.trim().split(';')) {
				const [key, boundary] = str.split('=')
				if (key.toLowerCase() == 'boundary') {
					return boundary
				}
			}
		}
	}

	// static middleware(): Handle<Method> {
	// 	return async ctx => {
			// ctx.body.size = 1024 * 1024 * 50
			// const data = new Multipart(await ctx.body.buffer(), Multipart.getBoundary(ctx.headers['content-type']))
			// return data
		// }
	// }
}
