import {AsyncLocalStorage} from 'node:async_hooks'

const pairSplitRegExp = /; */
const cookieMapStorage = new AsyncLocalStorage<CookieMap>()
const cookieStorage = new AsyncLocalStorage<Cookie>()

interface CookieOptions {
	domain?: string
	path?: string
	maxAge?: number
	expires?: Date | number
	sameSite?: 'lax' | 'strict' | 'none'
	httpOnly?: boolean
	secure?: boolean
}

export class Cookie {
	private store: Map<string, string> = new Map()

	constructor() {
	}

	get size(): number {
		return this.store.size
	}

	static Init(): Cookie {
		if (!cookieStorage.getStore()) cookieStorage.enterWith(new Cookie())
		return cookieStorage.getStore() as Cookie
	}

	static createCookie(key: string, value: string, options: CookieOptions) {
		return `${key}=${value}`
			+ (options.domain && `; domain=${options.domain}` || '')
			+ (options.path && `; path=${options.path}` || '')
			+ (options.expires && `; expires=${options.expires instanceof Date
				? options.expires.toUTCString()
				: new Date(options.expires).toUTCString()}` || '')
			+ (options.maxAge && `; Max-Age=${options.maxAge}` || '')
			+ (options.httpOnly && '; httponly' || '')
			+ (options.sameSite && `; samesite=${options.sameSite}` || '')
			+ (options.secure && '; secure' || '')
	}

	static Parse(header: { cookie?: string }): CookieMap {
		if (!cookieMapStorage.getStore()) cookieMapStorage.enterWith(new CookieMap(header.cookie))
		// if (cookieMapStorage.getStore())
		return cookieMapStorage.getStore() as CookieMap
		// if (cookieMapStorage.getStore()) return cookieMapStorage.getStore()
		// const cookie = new CookieMap(header.cookie)
		// cookieMapStorage.enterWith(cookie)
		// return cookie
	}

	set(name: string, value: string, options: CookieOptions): void {
		this.store.set(name, Cookie.createCookie(name, value, options))
	}

	has(name: string): boolean {
		return this.store.has(name)
	}

	clear(): void {
		this.store.clear()
	}

	delete(name: string): boolean {
		return this.store.delete(name)
	}

	toJSON() {
		return Object.fromEntries(this.store)
	}

	toArray(): string[] {
		return [...this.store.values()]
	}
}

export class CookieMap {
	private store: Map<string, string> = new Map

	constructor(cookie?: string) {
		if (!cookie) return
		for (const cookiePair of cookie.split(pairSplitRegExp)) {
			const i = cookiePair.indexOf('=')
			if (i > 0) this.store.set(cookiePair.slice(0, i).trim(), cookiePair.slice(i + 1).trim())
		}
	}

	get(name: string) {
		return this.store.get(name)
	}
}
