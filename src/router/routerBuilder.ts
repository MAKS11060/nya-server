import {HttpMethod} from '../httpMethod.js'
import {pathnameNormalize} from '../lib/utils.js'
import {RouteHandle, MiddlewareHandle, Router} from './router.js'

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
export class RouterBuilder {
  readonly router = new Router()
  #prefix: string = ''
  #store = new Map<string, [string, RouteHandle][]>()
  #handlers: [string, RouteHandle][] = []
  #middleware: MiddlewareHandle[] = []

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
      for (const [method, handle] of v) {
        this.router.route(method, k, handle)
      }
    }
    for (const middleware of this.#middleware) {
      this.router.use(middleware)
    }

    return this
  }

  handle(method: HttpMethod, handle: RouteHandle) {
    this.#handlers.push([method, handle])
    return this
  }

  get(handle: RouteHandle) {
    return this.handle('GET', handle)
  }

  put(handle: RouteHandle) {
    return this.handle('PUT', handle)
  }

  post(handle: RouteHandle) {
    return this.handle('POST', handle)
  }

  head(handle: RouteHandle) {
    return this.handle('HEAD', handle)
  }

  patch(handle: RouteHandle) {
    return this.handle('PATCH', handle)
  }

  delete(handle: RouteHandle) {
    return this.handle('DELETE', handle)
  }

  options(handle: RouteHandle) {
    return this.handle('OPTIONS', handle)
  }
}