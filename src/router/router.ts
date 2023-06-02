import 'urlpattern-polyfill'
import {Context} from '../context.js'
import {HttpMethod} from '../httpMethod.js'
import {pathnameNormalize} from '../lib/utils.js'

export type RouteHandle = (ctx: Context) => any

export type MiddlewareHandle = (ctx: Context, done?: () => Promise<void>) => void

interface RoutesHandler {
  pattern: URLPattern
  handle: RouteHandle
}

interface RouterOptions {
  prefix?: string
}

export class Router {
  #routes = new Map<HttpMethod, RoutesHandler[]>()
  #middleware: MiddlewareHandle[] = []
  #externalRouter: Router[] = []

  constructor(readonly init: RouterOptions = {}) {
  }

  static async Exec(router: Router, ctx: Context) {
    // handle middleware
    let promiseStack: Function[] = []
    for (const handle of router.middleware()) {
      handle(ctx, () => new Promise(resolve => promiseStack.push(resolve)))
    }

    // handle routes
    for (const match of router.match(ctx.method as HttpMethod, ctx.url)) {
      Context.SetUrlPatternResult(ctx, match.pattern.exec(ctx.url))
      await match.handle(ctx)
      if (ctx.responded) break
    }

    // middleware resolved
    // for (let resolve of promiseStack.reverse()) resolve()
    while (promiseStack.length > 0) {
      await promiseStack.pop()()
    }

    return Context.Response(ctx)
  }

  setRouter(router: Router) {
    if (this === router) throw new Error('Router cannot add itself')
    if (this.#externalRouter.includes(router)) throw new Error('Router already added')
    this.#externalRouter.push(router)
  }

  /**
   * @example
   * router.add('GET', '/posts', ctx => {
   *   ctx.respond(`Posts`)
   * })
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API URLPattern Syntax}
   * */
  add(method: HttpMethod, path: string, handle: RouteHandle): void
  /**
   * @example
   * router.add('GET', {pathname: '/posts'}, ctx => {
   *   ctx.respond(`Posts`)
   * })
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API URLPattern Syntax}
   * */
  add(method: HttpMethod, pattern: URLPatternInit | string, handle: RouteHandle): void
  add(method: HttpMethod, pattern: URLPatternInit | string, handle: RouteHandle) {
    if (!this.#routes.has(method)) this.#routes.set(method, [])
    const routes = this.#routes.get(method)

    if (typeof pattern == 'string') pattern = {pathname: pattern}
    if (this.init.prefix) pattern.pathname = pathnameNormalize(this.init.prefix, pattern.pathname)

    const urlPattern = new URLPattern(pattern)
    routes.push({pattern: urlPattern, handle})

    return this
  }

  /**
   * Add Middleware
   * ```ts
   *  app.router.use(async (ctx, done) => {
   *    let ts = performance.now()
   *    await done()
   *    ctx.header.set('x-time', (performance.now() - ts).toFixed(4))
   *  })
   * ```
   * */
  use(handle: MiddlewareHandle) {
    this.#middleware.push(handle)
    return this
  }

  /**
   * Add GET route
   *
   * @example
   * router.get('/posts', ctx => {
   *   ctx.respond(`Posts`)
   * })
   *
   * router.get('/posts/:id(\\d+)', ctx => {
   *   ctx.json({id: ctx.params['id']})
   * })
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API URLPattern Syntax}
   * */
  get(path: string, handle: RouteHandle): void
  get(pattern: URLPatternInit, handle: RouteHandle): void
  get(pattern: URLPatternInit | string, handle: RouteHandle) {
    this.add('GET', pattern, handle)
    return this
  }

  /**
   * Add POST route
   *
   * @example
   * router.post('/posts/:id', async ctx => {
   *   const body = await ctx.body.json()
   *   ctx.json({
   *     id: ctx.params['id']
   *     data: body
   *   })
   * })
   *
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API URLPattern Syntax}
   * */
  post(path: string, handle: RouteHandle): void
  post(pattern: URLPatternInit, handle: RouteHandle): void
  post(pattern: URLPatternInit | string, handle: RouteHandle) {
    this.add('POST', pattern, handle)
    return this
  }

  put(path: string, handle: RouteHandle): void
  put(pattern: URLPatternInit, handle: RouteHandle): void
  put(pattern: URLPatternInit | string, handle: RouteHandle) {
    this.add('PUT', pattern, handle)
    return this
  }

  patch(path: string, handle: RouteHandle): void
  patch(pattern: URLPatternInit, handle: RouteHandle): void
  patch(pattern: URLPatternInit | string, handle: RouteHandle) {
    this.add('PATCH', pattern, handle)
    return this
  }

  delete(path: string, handle: RouteHandle): void
  delete(pattern: URLPatternInit, handle: RouteHandle): void
  delete(pattern: URLPatternInit | string, handle: RouteHandle) {
    this.add('DELETE', pattern, handle)
    return this
  }

  options(path: string, handle: RouteHandle): void
  options(pattern: URLPatternInit, handle: RouteHandle): void
  options(pattern: URLPatternInit | string, handle: RouteHandle) {
    this.add('OPTIONS', pattern, handle)
    return this
  }

  head(path: string, handle: RouteHandle): void
  head(pattern: URLPatternInit, handle: RouteHandle): void
  head(pattern: URLPatternInit | string, handle: RouteHandle) {
    this.add('HEAD', pattern, handle)
    return this
  }

  * match(method: HttpMethod, uri: URL) {
    if (this.#routes.has(method)) {
      for (const route of this.#routes.get(method)) {
        if (route.pattern.test(uri)) {
          yield route
        }
      }
    }

    // External
    for (const router of this.#externalRouter) {
      if (router.#routes.has(method)) {
        for (const route of router.#routes.get(method)) {
          if (route.pattern.test(uri)) {
            yield route
          }
        }
      }
    }
  }

  * middleware(): Iterable<MiddlewareHandle> {
    for (const middleware of this.#middleware) {
      yield middleware
    }

    for (const router of this.#externalRouter) {
      yield* router.middleware()
    }
  }
}
