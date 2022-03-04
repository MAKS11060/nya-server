import path from 'path'
import {TypedEmitter} from 'tiny-typed-emitter'
import {readFile, stat} from 'fs/promises'
import {Files} from '../lib/files.js'
import {Handle} from '../core/handler.js'
import {Method} from '../core/context.js'

type SPAEvents = {
	error: (error: Error) => void
}

type SPAOptions = {
	index: string
	root?: string
	watch?: boolean
	cache?: boolean
	log?: undefined | 'INFO' | 'DEBUG'
}

export class SPA extends TypedEmitter<SPAEvents> {
	readonly options: SPAOptions
	readonly index: string = 'index.html'
	readonly root: string

	cache: Map<string, string> = new Map

	constructor(options: SPAOptions) {
		super()
		this.options = options
		this.index = path.resolve(options.index)
		this.root = options.root ? path.resolve(options.root) : path.dirname(this.index)

		this.createCacheMap()

		if (options.watch) Files.watchFolder(this.root, 250, async (eventType, /*filename*/) => {
			if (eventType == 'rename') await this.createCacheMap()
			if (!options.log) return
			if (eventType == 'rename') console.log('[re]createCacheMap')
		})
	}

	async createCacheMap() {
		this.cache.clear()
		for await (const file of Files.readDir(this.root)) {
			this.cache.set(path.relative(this.root, file).replaceAll('\\', '/'), file)
		}
	}

	get(pathname: string): string {
		if (pathname == '/') pathname = path.basename(this.index)
		return this.cache.get(pathname.replace('/', ''))
	}

	has(pathname: string): boolean {
		return !!this.get(pathname)
	}

	async getFile(pathname: string): Promise<Buffer> {
		return await readFile(this.get(pathname))
	}

	middleware(): Handle<Method> {
		return async ctx => {
			const {pathname} = ctx.uri
			if (!this.has(pathname)) return

			const send = async () => {
				// Last Modified cache
				const {mtime, size} = await stat(this.get(pathname))
				if (ctx.headers?.['if-modified-since'] == mtime.toUTCString()) {
					ctx.header['content-length'] = size
					ctx.mimeType(this.get(pathname))
						.status(304).send()
					return
				}

				ctx.header['last-modified'] = mtime.toUTCString()
				ctx.mimeType(this.get(pathname)).send(await this.getFile(pathname))
			}

			try {
				await send()
			} catch (e) {
				try {
					// try rescan folder
					await this.createCacheMap()
					await stat(this.get(pathname))
					await send() // 2 try
					console.log('SPA Send before rescan')
				} catch (e) {
					throw e
				}
				if (this.eventNames().includes('error')) this.emit('error', e)
				else throw e
			}
		}
	}
}
