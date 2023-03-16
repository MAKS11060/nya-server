import {parse as qs} from 'node:querystring'
import {Readable} from 'node:stream'
import {arrayBuffer, blob, json, text} from 'node:stream/consumers'

export class Body {
  #readable: Readable
  #type: string
  #bodyUsed = false

  constructor(readable: Readable, headers: Headers) {
    this.#readable = readable
    this.#type = headers.get('content-type')
  }

  get bodyUsed() {
    return this.#bodyUsed
  }

  async* [Symbol.asyncIterator](): AsyncIterator<Buffer> {
    if (this.bodyUsed) throw new Error('Body is already used')
    else this.#bodyUsed = true
    for await (const c of this.#readable) {
      yield c
    }
  }

  /**
   * Return utf-8 string
   */
  text() {
    if (this.bodyUsed) throw new Error('Body is already used')
    else this.#bodyUsed = true
    return text(this.#readable)
  }

  /** MIME type
   * - application/json
   */
  json() {
    if (this.bodyUsed) throw new Error('Body is already used')
    else this.#bodyUsed = true
    if (this.#type !== 'application/json') throw new Error('Content-Type must be application/json')
    return json(this.#readable)
  }

  blob() {
    if (this.bodyUsed) throw new Error('Body is already used')
    else this.#bodyUsed = true
    return blob(this.#readable)
  }

  arrayBuffer() {
    if (this.bodyUsed) throw new Error('Body is already used')
    else this.#bodyUsed = true
    return arrayBuffer(this.#readable)
  }

  /** MIME type
   * - multipart/form-data
   */
  async formData() {
    const [content, b] = this.#type.split(';', 2)
    if (content !== 'multipart/form-data' || !b.trim()) throw new Error('Content-type must be multipart/form-data')
    return new Response(await this.arrayBuffer(), {
      headers: {'content-type': this.#type},
    }).formData()
  }

  /** MIME type
   * - application/x-www-form-urlencoded
   */
  async queryString() {
    if (this.#type !== 'application/x-www-form-urlencoded') throw new Error('Content-type must be application/x-www-form-urlencoded')
    return qs(await this.text())
  }
}