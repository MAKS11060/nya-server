interface Cookie {
  /** Name of the cookie. */
  name: string

  /** Value of the cookie. */
  value: string

  /**
   * The cookie's `Expires` attribute, either as an explicit date or UTC milliseconds.
   * ```ts
   * const cookie: Cookie = {
   *   name: 'name',
   *   value: 'value',
   *   // expires 10 seconds from now
   *   expires: Date.now() + 10000
   * }
   * ```
   */
  expires?: Date | number

  /** The cookie's `Max-Age` attribute, in seconds. Must be a non-negative integer. A cookie with a `maxAge` of `0` expires immediately. */
  maxAge?: number

  /** The cookie's `Domain` attribute. Specifies those hosts to which the cookie will be sent. */
  domain?: string

  /** The cookie's `Path` attribute. A cookie with a path will only be included in the `Cookie` request header if the requested URL matches that path. */
  path?: string

  /** The cookie's `Secure` attribute. If `true`, the cookie will only be included in the `Cookie` request header if the connection uses SSL and HTTPS. */
  secure?: boolean

  /** The cookie's `HTTPOnly` attribute. If `true`, the cookie cannot be accessed via JavaScript. */
  httpOnly?: boolean

  /** Allows servers to assert that a cookie ought not to be sent along with cross-site requests. */
  sameSite?: 'Strict' | 'Lax' | 'None'
}

interface DeleteCookie {
  name: string
  path?: string
  domain?: string
}

const FIELD_CONTENT_REGEXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/

const validateName = (name: string | undefined | null) => {
  if (name && !FIELD_CONTENT_REGEXP.test(name)) {
    throw new TypeError(`Invalid cookie name: "${name}".`)
  }
}

const toString = (cookie: Cookie): string => {
  validateName(cookie.name)
  let out = [`${cookie.name}=${cookie.value}`]

  if (cookie.name.startsWith('__Secure')) {
    cookie.secure = true
  }
  if (cookie.name.startsWith('__Host')) {
    cookie.path = '/'
    cookie.secure = true
    delete cookie.domain
  }

  if (cookie.secure) {
    out.push('Secure')
  }
  if (cookie.httpOnly) {
    out.push('HttpOnly')
  }
  if (typeof cookie.maxAge === 'number' && Number.isInteger(cookie.maxAge)) {
    if (cookie.maxAge < 0) throw new Error('Max-Age must be an integer superior or equal to 0')
    out.push(`Max-Age=${cookie.maxAge}`)
  }
  if (cookie.domain) {
    // validateDomain(cookie.domain)
    out.push(`Domain=${cookie.domain}`)
  }
  if (cookie.sameSite) {
    out.push(`SameSite=${cookie.sameSite}`)
  }
  if (cookie.path) {
    // validatePath(cookie.path)
    out.push(`Path=${cookie.path}`)
  }
  if (cookie.expires) {
    out.push(`Expires=${(typeof cookie.expires == 'number' ? new Date(cookie.expires) : cookie.expires).toUTCString()}`)
  }

  return out.join('; ')
}

export const getCookies = (headers: Headers): Record<string, string> => {
  const cookie = headers.get('Cookie')
  if (cookie != null) {
    const out: Record<string, string> = {}
    const c = cookie.split(';')
    for (const kv of c) {
      const [cookieKey, ...cookieVal] = kv.split('=')
      const key = cookieKey.trim()
      out[key] = cookieVal.join('=')
    }
    return out
  }
  return {}
  // const cookiePairs = headers.get('cookie')!
  //   .split('; ')
  //   .map(pair => pair.split('=', 2)) as [string, string][]
}

export const setCookie = (headers: Headers, cookie: Cookie) => {
  headers.append('set-cookie', toString(cookie))
}

export class Cookies {
  #header: Headers
  constructor(header: Headers) {
    this.#header = header
  }

  set(cookie: Cookie) {
    setCookie(this.#header, cookie)
  }

  delete(cookie: DeleteCookie) {
    this.set({
      ...cookie,
      value: '',
      expires: new Date(0),
    })
  }
}
