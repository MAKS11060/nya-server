'use strict'

const ms = require('ms')
// const crypto = require('crypto')

const pairSplitRegExp = /; */;
const sameSiteRegExp = /^(?:lax|strict)$/i
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

const config = {
	path: '/',
	expires: undefined,
	maxAge: 0,
	domain: undefined,
	httpOnly: true,
	secure: true,
	sameSite: false,
}

module.exports = ctx => {
	const cookie = ctx.headers['cookie'] || null
	const cookies = {}

	Object.defineProperty(ctx, 'cookies', {
		enumerable: false, writable: false, configurable: false,
		value: cookie
		? Object.fromEntries(cookie.split(pairSplitRegExp).map(i => i.split('=').map(i => i.trim())))
		: {}
	})

	const createCookie = prop => {
		let cookie = `${prop.name}=${prop.value}`

		cookie += prop.domain
		? `; domain=${prop.domain}` : ''
		cookie += prop.path
		? `; path=${prop.path}` : ''
		cookie += prop.expires
		? `; expires=${prop.expires.toUTCString()}` : ''
		cookie += prop.maxAge 
		? `; Max-Age=${prop.maxAge}` : ''
		cookie += prop.httpOnly
		? `; httponly` : ''
		cookie += prop.secure
		? `; secure` : ''
		prop.sameSite
		? `; samesite=${prop.sameSite === true ? 'strict' : prop.sameSite.toLowerCase()}` : ''

		return cookie
	}

	const setCookies = () => {
		ctx.header['Set-Cookie'] = []
		for (const key in cookies) {
			ctx.header['Set-Cookie'].push(cookies[key])
		}
	}

	// methods
	const set = (name, value, attr) => {
		if (typeof attr === 'string') {attr={maxAge: ms(attr)/1000}}
		if (typeof attr === 'number') {attr={maxAge: attr}}

		cookies[name] = createCookie({
			...config, name, value, ...attr
		})

		setCookies()
	}

	const get = name => ctx.cookies[name] || null
	
	const del = (...name) => {
		for (const item of name.flat()) {
			set(item, '', {expires: new Date(0)})
		}
	}

	const clear = () => {
		for (let name in ctx.cookies) {
			set(name, '', {expires: new Date(0)})
		}
	}

	Object.defineProperty(ctx, 'cookie', {
		enumerable: true, writable: false, value: {
			set, get, del, clear
		}
	})

}
