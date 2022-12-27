export const methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'PATCH'] as const

type Methods = typeof methods[number]

type Request = {
  url: string;
  method: string
}

type RouteHandle = (request: Request) => any

/** Recursive route structure */
type RouteEntry<T extends Function = RouteHandle> = Partial<Record<Uppercase<Methods>, T>>
  & { /** Middleware */ use?: T, /** Handle all methods */ any?: T }
  | { /** Route */ [p: string]: RouteEntry }

/**
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
 * */
export const Route = (Entry: RouteEntry) => Entry

/**
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
 * */
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
}
