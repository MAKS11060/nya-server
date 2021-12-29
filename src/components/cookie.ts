import ms from 'ms'

const pairSplitRegExp = /; */
//const sameSiteRegExp = /^(?:lax|strict)$/i
//const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/

type Options = {
	domain?: string
	path?: string
	expires?: Date
	maxAge?: number
	httpOnly?: boolean
	sameSite?: string | 'lax' | 'strict' | 'none'
	secure?: boolean
}

export class Cookie {
	private readonly cache: Map<string, string> = new Map
	private _cookie: Map<string, string> = new Map

	constructor(cookie?: string) {
		if (cookie) this.cache = new Map<string, string>(Cookie.parse(cookie))
	}

	get cookies(): Map<string, string> {
		return this.cache
	}

	get size(): number {
		return this._cookie.size
	}

	static parse(cookie: string): Map<string, string> {
		const cookies: Map<string, string> = new Map
		for (const cookiePair of cookie.split(pairSplitRegExp)) {
			let [key, value] = cookiePair.split('=', 2).map(c => c.trim())
			cookies.set(key, value)
		}
		return cookies
	}

	static createCookie(key: string, value: string, opts: Options = {}) {
		return `${key}=${value}`
			+ (opts.domain && `; domain=${opts.domain}` || '')
			+ (opts.path && `; path=${opts.path}` || '')
			+ (opts.expires && `; expires=${opts.expires.toUTCString()}` || '')
			+ (opts.maxAge && `; Max-Age=${typeof opts.maxAge === 'string' ? ms(opts.maxAge) / 1000 : opts.maxAge}` || '')
			+ (opts.httpOnly && '; httponly' || '')
			+ (opts.sameSite && `; samesite=${opts.sameSite}` || '')
			+ (opts.secure && '; secure' || '')
	}

	set(key: string, value: string, options: Options): void {
		this._cookie.set(key, Cookie.createCookie(key, value, options))
	}

	get(key: string): string {
		return this._cookie.get(key)
	}

	has(key: string): boolean {
		return this._cookie.has(key)
	}

	clear(): void {
		this._cookie.clear()
	}

	delete(key: string): boolean {
		return this._cookie.delete(key)
	}

	toJSON(): any {
		return Object.fromEntries(this._cookie)
	}

	toArray(): string[] {
		return [...this._cookie.values()]
	}
}
