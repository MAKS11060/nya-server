/*
import {buffer} from 'node:stream/consumers'
import {BrotliCompress, BrotliOptions, createBrotliCompress, createGzip, Gzip, ZlibOptions} from 'node:zlib'

export type CompressAlgorithm = 'br' | 'gzip'

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

interface CreateCompressOptions {
  br?: BrotliOptions
  gzip?: ZlibOptions
}

export const compress = async (data: Uint8Array, init: CompressInit) => {
  let compressor: BrotliCompress | Gzip
  if (init.alg == 'br') compressor = createBrotliCompress(init?.br)
  if (init.alg == 'gzip') compressor = createGzip(init?.gzip)
  if (init.alg == 'identity') return data // pass
  compressor.end(data) // write
  return Uint8Array.from(await buffer(compressor))
}

export const COMPRESS_MIN_SIZE = 50

export const createCompressor = async (options: CreateCompressOptions, data: Uint8Array) => {
  if (options.br) {
    const brotliCompress = createBrotliCompress(options.br).end(data)
    return Uint8Array.from(await buffer(brotliCompress))
  }
  if (options.gzip) {
    const gzip = createGzip(options.gzip).end(data)
    return Uint8Array.from(await buffer(gzip))
  }
}

export const compressor = (options: CreateCompressOptions) => {
  return () => {}
}

export interface CompressorOptions {
  encoding: CompressAlgorithm[]
}*/
