import type http from 'node:http'
import type http2 from 'node:http2'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
import type {ReadableStream as NodeReadableStream} from 'node:stream/web'

const isStream = (response: Response) => {
  return response.headers.has('content-encoding') ||
    response.headers.has('transfer-encoding') ||
    response.headers.has('content-length') ||
    !/^(application\/json\b|text\/(?!event-stream\b))/i.test(response.headers.get('content-type'))
}

const headersToObject = (headers?: Headers) => {
  if (!headers) return {}
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

export const requestToWeb = (req: http.IncomingMessage): Request => {
  const url = new URL(req.url, `http://${req.headers['host']}`)
  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: req.headers as HeadersInit,
  }

  if (!(init.method === 'GET' || init.method === 'HEAD')) {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>
    init.duplex = 'half'
  }

  return new Request(url, init)
}

export const h2streamToWeb = (stream: http2.ServerHttp2Stream, headersRaw: http2.IncomingHttpHeaders): Request => {
  const url = new URL(headersRaw[':path'], `${headersRaw[':scheme']}://${headersRaw[':authority']}`)
  const init: RequestInit & { duplex?: 'half' } = {
    method: headersRaw[':method'],
    headers: headersRaw as HeadersInit,
  }

  if (!(init.method === 'GET' || init.method === 'HEAD')) {
    init.body = Readable.toWeb(stream) as ReadableStream<Uint8Array>
    init.duplex = 'half'
  }

  return new Request(url, init)
}

export const respondWith = async (res: http.ServerResponse, response: Response) => {
  if (response.body) {
    try {
      if (isStream(response)) {
        res.writeHead(response.status, headersToObject(response.headers))
        await pipeline(Readable.fromWeb(response.body as NodeReadableStream), res)
        return
      }

      const arrayBuffer = await response.arrayBuffer()
      response.headers.set('content-length', `${arrayBuffer.byteLength}`)
      res.writeHead(response.status, headersToObject(response.headers))
      // res.end(Buffer.from(arrayBuffer))
      res.end(new Uint8Array(arrayBuffer))
    } catch (e) {
      console.error(e)
      const err = e instanceof Error ? e : new Error('unknown error', {cause: e})
      res.destroy(err)
    }
  } else {
    res.writeHead(response.status, headersToObject(response.headers))
    res.end()
  }
}

export const h2respondWith = async (stream: http2.ServerHttp2Stream, response: Response) => {
  if (response.body) {
    try {
      if (isStream(response)) {
        stream.respond({
          ':status': response.status,
          ...headersToObject(response.headers),
        })
        await pipeline(Readable.fromWeb(response.body as NodeReadableStream), stream)
        return
      }

      const arrayBuffer = await response.arrayBuffer()
      response.headers.set('content-length', `${arrayBuffer.byteLength}`)
      stream.respond({
        ':status': response.status,
        ...headersToObject(response.headers),
      })
      stream.end(Buffer.from(arrayBuffer))
    } catch (e) {
      console.error(e)
      const err = e instanceof Error ? e : new Error('unknown error', {cause: e})
      stream.destroy(err)
    }
  } else {
    stream.respond({
      ':status': response.status,
      ...headersToObject(response.headers),
    })
    stream.end()
  }
}
