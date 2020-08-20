import ms from 'ms'

const pairSplitRegExp = /; */
//const sameSiteRegExp = /^(?:lax|strict)$/i
//const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/

const createCookie = prop => {
	return `${prop.name}=${prop.value}`
	+	(prop.domain   && `; domain=${prop.domain}` || '')
	+ (prop.path     && `; path=${prop.path}` || '')
	+ (prop.expires  && `; expires=${prop.expires.toUTCString()}` || '')
	+ (prop.maxAge   && `; Max-Age=${typeof prop.maxAge === 'string' ? ms(prop.maxAge)/1000 : prop.maxAge}` || '')
	+ (prop.httpOnly && '; httponly' || '')
	+ (prop.secure   && '; secure' || '')
	+ (prop.sameSite && `; samesite=${prop.sameSite === true ? 'strict' : prop.sameSite.toLowerCase()}` || '')
}

const writeCookie = ctx => {
	const {cookies = {}} = ctx.state
	ctx.header['Set-Cookie'] = []
	for (const key in cookies) {
		ctx.header['Set-Cookie'].push(cookies[key])
	}
}

export default config => {
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
		const cookies = ctx.state.cookies = {}
		const cookie = ctx.headers.cookie || ''

		Object.defineProperties(ctx, {
			cookies: {
				get() {
					return Object.fromEntries(
						cookie.split(pairSplitRegExp)
						.map(i => i.split('=').map(i => i.trim()))
					)
				}
			},
			cookie: {
				enumerable: true,
				value: Object.create(null, {
					set: {
						enumerable: true,
						value: (name, value, attr) => {
							if (typeof attr === 'string') {attr={maxAge: ms(attr)/1000}}
							else if (typeof attr === 'number') {attr={maxAge: attr}}
							
							cookies[name] = createCookie({
								...config, name, value, ...attr
							})
							
							writeCookie(ctx)
						}
					},
					get: {
						enumerable: true,
						value: name => ctx.cookies[name] || null
					},
					has: {
						enumerable: true,
						value: name => Boolean(ctx.cookies[name])
					},
					remove: {
						enumerable: true,
						value: (...name) => {
							for (const item of name) {
								ctx.cookie.set(item, '', {expires: new Date(0)})
							}
						}
					},
					clear: {
						enumerable: true,
						value: (...whitelist) => {
							for (const [name] of Object.entries(ctx.cookies).filter(([key]) => !whitelist.includes(key))) {
								ctx.cookie.remove(name)
							}
						}
					}
				})
			}
		})
	}
}
