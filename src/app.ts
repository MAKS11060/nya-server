import {Context} from './context.js'
import {HttpError} from './httpError.js'
import {Router} from './router/router.js'

interface AppOptions {
  router?: Router
  error?: (err: Error) => Response | void
}

/**
 * @example
 * const app = new App()
 * app.router.get('/', ctx => ctx.text('/'))
 *
 * Server.listen(app.fetch, {transport: 'http', port: 50000})
 *
 * */
export class App {
  readonly router: Router
  readonly fetch: OmitThisParameter<(request: Request) => Promise<Response>>

  #error?: ((err: Error) => void) | undefined

  constructor(options: AppOptions = {}) {
    this.router = options?.router ?? new Router()
    this.fetch = this.#fetch.bind(this)
    this.#error = options?.error
  }

  async #fetch(request: Request): Promise<Response> {
    try {
      const ctx = new Context(request)
      const res = await Router.Exec(this.router, ctx)
      return res ? res : new Response('', {status: 404})
    } catch (reason) {
      if (reason instanceof HttpError) {
        // @ts-ignore // Wait ts@5.2
        return Response.json({
          error: {
            status: reason.status,
            message: reason.expose ? reason.message : 'Server Error',
          },
        }, {
          status: reason.status,
          headers: reason.headers,
        })
      }

      if (this.#error) this.#error(reason as Error)

      // close connection
      return Response.error()
    }
  }
}
