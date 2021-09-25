import path from 'path'
import {promises as fs} from 'fs'
import {Context} from '../context.js'
import {TypedEmitter} from 'tiny-typed-emitter'

type SPAEvents = {
	error: (error: Error) => void
}

const EXTENSIONS = [
	'.html', '.htm', '.css',
	'.js', '.json',
	'.png', '.jpg', '.svg', '.webp'
]

const EXTENSIONS_DEV = [
	'.map'
]

export class SPA extends TypedEmitter<SPAEvents> {
	readonly index: string = 'index.html'
	readonly root: string
	readonly exts: Set<string>

	constructor(options: { index: string; root?: string; fileExtension?: string[]; dev?: boolean; }) {
		super()
		this.index = path.resolve(options.index)
		this.root = options.root ? path.resolve(options.root) : path.dirname(this.index)
		this.exts = new Set(options?.fileExtension || options.dev ? [...EXTENSIONS, ...EXTENSIONS_DEV] : EXTENSIONS)
	}

	middleware(): (ctx: Context) => void {
		return async ctx => {
			try {
				if (!path.extname(ctx.url.pathname)) {
					ctx.html(await fs.readFile(this.index))
				} else {
					if (this.exts.has(path.extname(ctx.url.pathname))) {
						const file = path.join(this.root, ctx.url.pathname)
						ctx.mimeType(file).send(await fs.readFile(file))
					} else {
						ctx.status(404).send()
					}
				}
			} catch (e) {
				if (this.eventNames().includes('error')) this.emit('error', e)
				else throw e
			}
		}
	}
}
