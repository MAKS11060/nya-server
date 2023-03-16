import {buffer} from 'node:stream/consumers'
import {BrotliCompress, BrotliOptions, createBrotliCompress, createGzip, Gzip, ZlibOptions} from 'node:zlib'

export const pathnameNormalize = (pathname: string): string => {
  return `/${pathname.split('/').filter(v => !!v).join('/')}` ?? '/'
}

export const parseAccept = (accept: string) => {
  return (accept.split(',').map(v => ({
    ...v.trim().match(/(?<content>(?<type>.+?)\/(?<sub>.+?)(?:\+(?<suffix>.+?))?)(?:;.*?(?:q=(?<weight>[.\d]+))?.*?)?(?:,|$)/).groups,
  })) as {
    content: string,
    type: string,
    sub: string,
    suffix: string,
    weight: string
  }[])
}

/**
 * IncomingHeaders to Headers
 */
export const objectToHeaders = (obj: Record<string, string | string[]>) => {
  const headers = new Headers()
  for (const key in obj) headers.set(key, `${obj[key]}`)
  return headers
}

/**
 * Headers to http.OutgoingHttpHeader
 */
export const headersToObject = (headers: Headers) => {
  let setCookie: string[]
  let header: Record<string, string | string[] | number> = {}
  for (const [key, val] of headers) {
    if (key === 'set-cookie') {
      if (!setCookie) header[key] = setCookie = []
      setCookie.push(val)
      continue
    }
    header[key] = val
  }
  return header
}

/**
 * Copy Headers to Dist
 */
export const copyHeaders = (dist: Headers, headers?: Headers) => {
  if (headers) {
    if (headers instanceof Headers) {
      for (let [name, value] of headers) {
        if (name === 'set-cookie') dist.append(name, value)
        else dist.set(name, value)
      }
    } else {
      throw new TypeError('headers must be of type Headers')
    }
  }
}

type CompressAlgorithm = 'br' | 'gzip' | 'identity'

/**
 * Parse Accept-Encoding: `br, deflate, gzip;q=1.0`
 */
export const acceptEncoding = (headers: Headers, algorithms?: CompressAlgorithm[]) => {
  if (!headers.has('accept-encoding')) return
  const ae = headers.get('accept-encoding').split(',').map(v => v.trim().split(';')[0])
  for (const algorithm of algorithms) {
    if (ae.includes(algorithm)) {
      return algorithm as CompressAlgorithm
    }
  }
}

export interface CompressConfig {
  enabled?: boolean
  accept?: CompressAlgorithm[]
  br?: BrotliOptions
  gzip?: ZlibOptions
}

export interface CompressInit {
  alg: CompressAlgorithm
  br?: BrotliOptions
  gzip?: ZlibOptions
}

export const compress = (data: Uint8Array, init: CompressInit) => {
  let compressor: BrotliCompress | Gzip
  if (init.alg == 'br') compressor = createBrotliCompress(init?.br)
  if (init.alg == 'gzip') compressor = createGzip(init?.gzip)
  if (init.alg == 'identity') return Buffer.from(data) // pass
  compressor.end(Buffer.from(data)) // write
  return buffer(compressor)
}
