import {Context} from './context.js'
import {pathnameNormalize} from './utils.js'

const methods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'PATCH'] as const

export type Methods = typeof methods[number]

export type Handle = (ctx: Context) => void | Promise<void>

export type MiddlewareHandle = (ctx: Context, done: () => Promise<any>) => void

export class Router {
  #routes = new Map<string, [URLPattern, Handle][]>()
  #middleware: MiddlewareHandle[] = []

  constructor() {
  }

  static Builder(...args: ConstructorParameters<typeof RouterBuilder>) {
    return new RouterBuilder(...args)
  }

  static* Match(router: Router, method: string, url: URL): Iterable<[URLPattern, Handle]> {
    method = method.toUpperCase()
    if (!router.#routes.has(method)) return null
    for (const [urlPattern, handle] of router.#routes.get(method)) {
      if (urlPattern.test(url)) {
        yield [urlPattern, handle]
      }
    }
  }

  static async Handle(router: Router, ctx: Context) {
    // handle middleware
    let promiseStack: Function[] = []
    for (let handle of router.#middleware) {
      handle(ctx, () => new Promise(resolve => promiseStack.push(resolve)))
    }

    // handle routes
    for (const [urlPattern, handle] of Router.Match(router, ctx.method, ctx.url)) {
      Context.SetUrlPatternResult(ctx, urlPattern.exec(ctx.url))
      await handle(ctx)
      if (ctx.responded) break
    }

    // middleware resolved
    // for (let resolve of promiseStack) resolve()
    for (let resolve of promiseStack.reverse()) resolve()
  }

  setRouter(router: Router | RouterBuilder) {
    if (router instanceof RouterBuilder) {
      this.setRouter(router.router)
      return
    }

    // merge Router
    for (const [method, routes] of router.#routes) {
      for (let [pattern, route] of routes) {
        this.route(method, pattern, route)
      }
    }
    for (const handle of router.#middleware) this.use(handle)

    const route = router.route.bind(router)
    const use = router.use.bind(router)

    router.route = (...args: Parameters<typeof this.route>) => {
      route(...args)
      this.route(...args)
    }
    router.use = (handle: MiddlewareHandle) => {
      use(handle)
      this.use(handle)
    }
  }

  /**
   * Add Middleware
   * ```ts
   * app.router.use(async (ctx, done) => {
   *   let ts = performance.now()
   *   await done()
   *   ctx.header.set('x-time', (performance.now() - ts).toFixed(4))
   * })
   *
   * ```
   * */
  use(handle: MiddlewareHandle) {
    this.#middleware.push(handle)
  }

  /**
   * Add Route
   * */
  route(method: string, pattern: URLPatternInit | string, handle: Handle) {
    method = method.toUpperCase()
    if (typeof pattern == 'string') pattern = {pathname: pattern}
    // pattern.pathname = pathnameNormalize(`${this.#pathname}/${pattern.pathname ?? ''}`)
    const urlPattern = new URLPattern(pattern)

    if (!this.#routes.has(method)) this.#routes.set(method, [])
    this.#routes.get(method).push([urlPattern, handle])
  }

  /**
   * Add GET route
   *
   * ```
   * app.router.get('/route/path', ctx => {
   *   ctx.respond('body')
   * })
   * ```
   * Pattern Syntax [URLPattern API]{@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API}
   * */
  get(pattern: URLPatternInit | string, handle: Handle) {
    this.route('GET', pattern, handle)
  }

  put(pattern: URLPatternInit | string, handle: Handle) {
    this.route('PUT', pattern, handle)
  }

  /**
   * Add POST route
   * ```
   * app.router.post('/api/post', async ctx => {
   *   ctx.respond(await ctx.body.json(), {
   *     status: 201
   *   })
   * })
   *
   * app.router.post('/api/login', async ctx => {
   *   const fd = await ctx.body.formData()
   *   if (fd.get('login') == 'root' && fd.get('password') == '1234') {
   *     return ctx.json({success: true})
   *   }
   *   ctx.json({success: false}, {status: 401})
   * })
   * ```
   * Pattern Syntax [URLPattern API]{@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API}
   * */
  post(pattern: URLPatternInit | string, handle: Handle) {
    this.route('POST', pattern, handle)
  }

  head(pattern: URLPatternInit | string, handle: Handle) {
    this.route('HEAD', pattern, handle)
  }

  patch(pattern: URLPatternInit | string, handle: Handle) {
    this.route('PATCH', pattern, handle)
  }

  delete(pattern: URLPatternInit | string, handle: Handle) {
    this.route('DELETE', pattern, handle)
  }

  options(pattern: URLPatternInit | string, handle: Handle) {
    this.route('OPTIONS', pattern, handle)
  }
}

/**
 * ```
 * const router = Router.Builder('api')
 *   .path('v1', r => r
 *     .path('text', r => r
 *       .get(ctx => {
 *         ctx.text('text')
 *       })
 *     )
 *   )
 * ```
 * */
class RouterBuilder {
  #prefix: string = ''
  #store = new Map<string, [string, Handle][]>()
  #handlers: [string, Handle][] = []
  #middleware: MiddlewareHandle[] = []

  readonly router = new Router()

  constructor(prefix: string = '') {
    this.#prefix = pathnameNormalize(prefix)
  }

  use(handle: MiddlewareHandle) {
    this.#middleware.push(handle)
    return this
  }

  /**
   * Add path segments
   * */
  path(path: string, builder: (r: RouterBuilder) => RouterBuilder) {
    path = pathnameNormalize(`${this.#prefix}/${path}`)

    const rb = new RouterBuilder(path)
    const r = builder(rb) // nested builder

    // detect new builder
    const isExternal = rb !== r

    // merge nested routes
    for (let [k, v] of r.#store) {
      if (!isExternal) {
        this.#store.set(k, v)
      } else {
        this.#store.set(`${path}/${k}`, v)
      }
    }

    if (!this.#store.has(path)) this.#store.set(path, r.#handlers)

    // merge to Router
    for (const [k, v] of this.#store) {
      for (const[method, handle] of v) {
        this.router.route(method, k, handle)
      }
    }
    for (const middleware of this.#middleware) {
      this.router.use(middleware)
    }

    return this
  }

  handle(method: Methods, handle: Handle) {
    this.#handlers.push([method, handle])
    return this
  }

  get(handle: Handle) {
    return this.handle('GET', handle)
  }
  put(handle: Handle) {
    return this.handle('PUT', handle)
  }
  post(handle: Handle) {
    return this.handle('POST', handle)
  }
  head(handle: Handle) {
    return this.handle('HEAD', handle)
  }
  patch(handle: Handle) {
    return this.handle('PATCH', handle)
  }
  delete(handle: Handle) {
    return this.handle('DELETE', handle)
  }
  options(handle: Handle) {
    return this.handle('OPTIONS', handle)
  }
}


/*
export const methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'PATCH'] as const

type Methods = typeof methods[number]

type Request = {
  url: string;
  method: string
}

type RouteHandle = (request: Request) => any

/!** Recursive route structure *!/
type RouteEntry<T extends Function = RouteHandle> = Partial<Record<Uppercase<Methods>, T>>
  & { /!** Middleware *!/ use?: T, /!** Handle all methods *!/ any?: T }
  | { /!** Route *!/ [p: string]: RouteEntry }

/!**
 * Example
 * ```ts
 * const route = Route({
 *   GET: request => 'GET /'
 *   api: {
 *     v1 {
 *      echo: {
 *        POST: async request => 'POST /api/echo ' + await request.text()
 *      }
 *     }
 *   }
 * })
 * ```
 * *!/
export const Route = (Entry: RouteEntry) => Entry

/!**
 * Example
 * ```ts
 * const route = Route({})
 * const router = new Router(route)
 * router.getMap()
 * // Map(2) {
 * //  '/': {GET: Function}
 * //  '/api/v1/echo': {POST: Function}
 * // }
 * ```
 * *!/
export class Router {
  #routeMap = new Map<string, RouteEntry>()

  constructor(readonly route: RouteEntry) {
    this.parse(route)
  }

  getMap() {
    return this.#routeMap
  }

  get(path: string): RouteEntry | null {
    return this.#routeMap.get(path) ?? null
  }

  private set(path: string, key: string, val: RouteEntry) {
    if (path == '') path = '/' // set default prefix
    const entry = this.#routeMap.get(path) || {}
    entry[key as Methods] = val
    this.#routeMap.set(path, entry)
  }

  private parse(route: RouteEntry | any, path: string = '') {
    Object.keys(route).map((key) => {
      // Set HTTP method and Middleware
      if (methods.includes(key as Methods) || key == 'use') {
        this.set(path, key, route[key])
      } else { // Nested routes
        this.parse(route[key], `${path}/${key}`)
      }
    })
  }

  static handler() {
  }
}*/
