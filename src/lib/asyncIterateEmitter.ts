/**
 * @example
 * const server = http.createServer()
 * const iterateEmitter = new AsyncIterateEmitter<{ request: http.IncomingMessage, response: http.ServerResponse }>()
 *
 * server.on('request', (request, response) => iterateEmitter.emit({request, response}))
 * server.once('close', () => iterateEmitter.destroy()) // last resolve
 * server.listen(50000, () => console.log('Server listening on http://localhost:50000'))
 *
 * // Syntax like Deno
 * for await (const {request, response} of server) {
 *   console.log(request.method, request.url)
 *   response.end('')
 * }
 * console.log('end')
 */
export class AsyncIterateEmitter<T> {
  #queue: Promise<T>[] = []
  #resolve: Function
  #destroyed = false

  get destroyed() {
    return this.#destroyed
  }

  /** Add to queue */
  emit(data: T) {
    this.#queue.push(Promise.resolve(data))
    if (this.#resolve) this.#resolve = this.#resolve() // resolver self destroyer
  }

  /** Destroy Iterator */
  destroy() {
    this.#destroyed = true
    if (this.#resolve) this.#resolve = this.#resolve()
  }

  async* [Symbol.asyncIterator](): AsyncIterator<T> {
    while (!this.#destroyed) {
      while (this.#queue.length) yield this.#queue.pop()
      await new Promise(r => this.#resolve = r.bind(this)) // wait pull
    }
  }
}