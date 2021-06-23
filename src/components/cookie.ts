import ms from 'ms'
import {IContext} from './../context.js'


// export interface ICookies {
// 	domain?: string
// 	path?: string
// 	expires?: Date
// 	maxAge?: number
// 	httpOnly?: boolean
// 	secure?: boolean
// 	sameSite?: boolean | string
// }
//
// export interface ICookie extends ICookies {
// 	value: string
// }
//

const pairSplitRegExp = /; */
//const sameSiteRegExp = /^(?:lax|strict)$/i
//const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/


/*export const Cookie0 = (config?: ICookies): (ctx: IContext) => void => {
	config = {
		domain: undefined,
		path: '/',
		expires: undefined,
		maxAge: 0,
		httpOnly: true,
		secure: true,
		sameSite: false,
		...config
	}


	return ctx => {
/!*		if (!ctx.headers.cookie) {
			ctx.cookies = new Map<string, string>()
		} else {
			ctx.cookies = new Map(parse(ctx.headers.cookie))
		}*!/

		ctx.cookie = new Map<string, ICookie>()

		ctx.cookie = new Proxy(ctx.cookie, {
			get(target: Map<string, ICookie>, prop: PropertyKey, receiver: any): any {
				let cb = Reflect.get(target, prop, receiver)

				if (prop === 'set') {
					return (key, val) => {
						cb.call(target, key, val)

						if (target.size) {
							ctx.header['set-cookie'] = []
							for (const [key, opts] of target) {
								// ctx.header['set-cookie'].push(createCookie(key, opts.value, opts))
							}
						}
					}
				}

				if (prop === 'toJSON') {
					return (key, val) => {
						// cb.call(target, key, val)
						return Object.fromEntries(target)
					}
				}

				return cb.bind(target, prop, receiver)
			}
		})
	}
}

*/


type cookie = {
	domain?: string
	path?: string
	expires?: Date
	maxAge?: number
	httpOnly?: boolean
	secure?: boolean
	sameSite?: boolean | string
}


export interface ICookies {
}

export class Cookie implements ICookies {
	private readonly _cookies

	constructor(ctx: IContext) {
		this._cookies = ctx.headers.cookie ? new Map(Cookie.parse(ctx.headers.cookie)) : new Map()
	}

	private _cookie = new Map<string, string>()

	get cookie(): string[] {
		return [...this._cookie.values()]
	}

	get cookies(): Map<string, string> {
		return this._cookies
	}

	get size(): number {
		return this._cookie.size
	}

	static create(ctx: IContext) {
		return new this(ctx)
	}

	static parse(cookie: string): [string, string][] {
		// @ts-ignore // FUCK YOU
		return cookie.split(pairSplitRegExp).map(pairs => pairs.split('=', 2).map(pair => pair.trim()))
	}

	static createCookie(key: string, value: string, prop: cookie) {
		return `${key}=${value}`
			+ (prop.domain && `; domain=${prop.domain}` || '')
			+ (prop.path && `; path=${prop.path}` || '')
			+ (prop.expires && `; expires=${prop.expires.toUTCString()}` || '')
			+ (prop.maxAge && `; Max-Age=${typeof prop.maxAge === 'string' ? ms(prop.maxAge) / 1000 : prop.maxAge}` || '')
			+ (prop.httpOnly && '; httponly' || '')
			+ (prop.secure && '; secure' || '')
			+ (prop.sameSite && `; samesite=${prop.sameSite === true ? 'strict' : prop.sameSite.toLowerCase()}` || '')
	}

	set(key: string, value: string, options: cookie = {}): void {
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
}
