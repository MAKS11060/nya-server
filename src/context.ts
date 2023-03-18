import {Body} from './body.js'
import {Cookies, getCookies} from './cookie.js'
import {copyHeaders, parseAccept} from './utils.js'

interface ContextInit {
  method: string
  url: URL
  headers: Headers
  body: Body
}

type RespondBody = string | object | Uint8Array | ArrayBuffer

interface RespondInit {
  /**
   * Outgoing Headers
   */
  headers?: HeadersInit
  /**
   * Response status code
   * - 200 Ok (default)
   * - 300 Redirect
   * - 400 Client Error
   * - 500 Server Error
   */
  status?: number
  compress?: boolean
}

interface AcceptInit {
  /**
   * Accept: `text/html`
   * - content: 'text/html'
   * */
  content?: string

  /**
   * Accept: `text/html`
   * - type: 'text'
   * */
  type?: string

  /**
   * Accept: `text/html`
   * - sub: 'html'
   * */
  sub?: string

  /**
   * Accept: `application/<xhtml>+<xml>`
   * - suffix: `xhtml`
   * - sub: `xml`
   * */
  suffix?: string

  /**
   * Accept: `q=<weight>`
   * - weight: '0.8'
   * */
  weight?: string
}

interface JsonInit extends RespondInit {
  replacer?: (this: any, key: string, value: any) => any
  space?: string | number
}

export class Context {
  readonly method: string
  readonly url: URL
  readonly headers: Headers
  readonly body: Body

  header: Headers = new Headers()
  #urlPattern: URLPatternResult
  #cookie: Record<string, string>
  #cookies: Cookies

  #body: Uint8Array = new Uint8Array()
  #status: number = 200
  #responded: boolean = false
  #compress: boolean = false

  constructor(options: ContextInit) {
    this.url = options.url
    this.body = options.body
    this.headers = options.headers
    this.method = options.method

    if (this.pathname != this.pathname.replace(/\/+$/, '')) {
      this.redirect(this.pathname.replace(/\/+$/, ''))
    }
  }

  get pathname(): string {
    return this.url.pathname
  }

  /**
   * Search params from uri
   * */
  get query(): URLSearchParams {
    return this.url.searchParams
  }

  /**
   * The urlPattern object is only available on the route
   *
   * [URLPattern API]{@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API}
   * */
  get urlPattern(): URLPatternResult {
    return this.#urlPattern
  }

  /**
   * Uri params from `ctx.urlPattern.pathname.groups`
   * ```
   * '/search/:query' => {query: 'text'}
   * ```
   *
   * [URLPattern API]{@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API}
   * */
  get params() {
    return this.urlPattern.pathname.groups
  }

  /**
   * Return cookie object from Request
   * ```
   * {foo: 'bar'}
   * ```
   */
  get cookie() {
    if (!this.#cookie) this.#cookie = getCookies(this.headers)
    return this.#cookie
  }

  /**
   * Cookies for Response
   * @example
   * ctx.cookies.set({name: 'foo', value: 'bar', httpOnly: true, maxAge: 3600})
   *
   * ctx.cookies.delete({name: 'foo'})
   * */
  get cookies() {
    if (!this.#cookies) this.#cookies = new Cookies(this.header)
    return this.#cookies
  }

  /**
   * @description Return current status code
   * */
  get status() {
    return this.#status
  }

  /**
   * Return response status
   * */
  get responded() {
    return this.#responded
  }

  /**
   * Get respond data
   */
  static Response(ctx: Context) {
    return {
      body: ctx.#body,
      status: ctx.#status,
      header: ctx.header,
      compress: ctx.#compress,
    }
  }

  static SetUrlPatternResult(ctx: Context, urlPattern: URLPatternResult) {
    ctx.#urlPattern = urlPattern
  }

  /**
   * Send data
   */
  respond(body?: RespondBody, init?: RespondInit) {
    if (this.#responded) throw new Error('Respond after write')
    this.#responded = true

    if (body !== undefined) {
      if (body instanceof Uint8Array) this.#body = body
      else if (typeof body === 'string') this.#body = new TextEncoder().encode(body)
    }

    if (init?.headers) copyHeaders(this.header, new Headers(init?.headers))
    if (init?.status) this.#status = init.status
    if (init?.compress) this.#compress = init.compress

    this.header.set('content-length', this.#body.byteLength.toString())

    return this
  }

  /**
   * Respond application/json
   */
  json(data?: any, init?: JsonInit) {
    this.type('application/json')
    return this.respond(JSON.stringify(data, init?.replacer, init?.space), init)
  }

  /**
   * Respond text/plain
   */
  text(data?: string, init?: RespondInit) {
    this.type('text/plain; charset=utf-8')
    return this.respond(data, init)
  }

  /**
   * Redirect Status Code
   * - 301 Moved Permanently
   * - 302 Found, the temporary redirect
   * - 303 See Other (default)
   * - 304 Not Modified
   * - 307 Temporary Redirect
   * - 308 Permanent Redirect
   */
  redirect(uri: string | URL, status: number = 303) {
    if (status < 300 && status > 399) throw new Error('Redirect status must be 300 - 399')
    if (uri) this.header.set('location', uri.toString())
    return this.respond('', {status})
  }

  accept(init: AcceptInit) {
    if (!this.header.get('accept')) this.respond('', {status: 406})
    const accept = parseAccept(this.header.get('accept'))
    for (const el of accept) {
      if (init.content && init.content !== el.content
        || init.type && init.type !== el.type
        || init.sub && init.sub !== el.sub
        || init.suffix && init.suffix !== el.suffix
        || init.weight && init.weight !== el.weight
      ) return this.respond('', {status: 406})
      return true
    }
  }

  /**
   * Set Content-Type header
   */
  type(mimeType: string) {
    this.header.set('content-type', mimeType)
    return this
  }

  /**
   * Set `ETag` header
   *
   * return 304 status if `(etag == if-none-match)`
   */
  etag(etag: string) {
    if (this.headers.get('if-none-match') === etag) return this.redirect('', 304)
    this.header.set('etag', etag)
  }

  /**
   * - Set `Last-Modified` header
   *
   * return 304 status if `(last-modified == if-modified-since)`
   */
  lastModified(date: Date) {
    if (this.headers.get('if-modified-since') === date.toUTCString()) return this.redirect('', 304)
    this.header.set('last-modified', date.toUTCString())
  }
}
